from __future__ import annotations
import tempfile
from pathlib import Path
import numpy as np
import tensorflow as tf
import wntr
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sklearn.model_selection import train_test_split

router = APIRouter(prefix="/ml")

class SurrogateRequest(BaseModel):
    inp: str = Field(min_length=20)
    samples: int = Field(default=40, ge=8, le=200)
    epochs: int = Field(default=25, ge=1, le=100)
    seed: int = 42

@router.post("/surrogate")
def surrogate(req: SurrogateRequest):
    """Train TensorFlow only on actual EPANET 2.2/WNTR simulation outputs."""
    td=tempfile.TemporaryDirectory()
    try:
        path=Path(td.name)/"network.inp"; path.write_text(req.inp,encoding="utf-8")
        wn=wntr.network.WaterNetworkModel(str(path))
        junctions=list(wn.junction_name_list)
        if not junctions: raise ValueError("No junctions in INP")
        base=np.array([float(wn.get_node(j).base_demand) for j in junctions],dtype=np.float32)
        rng=np.random.default_rng(req.seed); X=[]; Y=[]
        for _ in range(req.samples):
            factors=rng.uniform(0.75,1.25,len(junctions)).astype(np.float32)
            for j,b,f in zip(junctions,base,factors): wn.get_node(j).demand_timeseries_list[0].base_value=float(b*f)
            wn.options.time.duration=0; wn.options.time.hydraulic_timestep=3600; wn.options.time.report_timestep=3600
            r=wntr.sim.EpanetSimulator(wn).run_sim(version=2.2,convergence_error=True)
            X.append(factors); Y.append(r.node["pressure"].iloc[0][junctions].to_numpy(dtype=np.float32))
            for j,b in zip(junctions,base): wn.get_node(j).demand_timeseries_list[0].base_value=float(b)
        X=np.asarray(X); Y=np.asarray(Y)
        Xtr,Xte,Ytr,Yte=train_test_split(X,Y,test_size=.2,random_state=req.seed)
        mu=Xtr.mean(0); sd=Xtr.std(0)+1e-6
        model=tf.keras.Sequential([tf.keras.layers.Input(shape=(X.shape[1],)),tf.keras.layers.Dense(128,activation="relu"),tf.keras.layers.Dense(128,activation="relu"),tf.keras.layers.Dense(Y.shape[1])])
        model.compile(optimizer="adam",loss="mse",metrics=[tf.keras.metrics.MeanAbsoluteError(name="mae")])
        h=model.fit((Xtr-mu)/sd,Ytr,validation_data=((Xte-mu)/sd,Yte),epochs=req.epochs,batch_size=min(16,len(Xtr)),verbose=0,callbacks=[tf.keras.callbacks.EarlyStopping(patience=5,restore_best_weights=True)])
        m=model.evaluate((Xte-mu)/sd,Yte,verbose=0,return_dict=True)
        return {"engine":"TensorFlow/Keras","source":"real WNTR + EPANET 2.2 simulations","samples":len(X),"junctions":junctions,"epochs":len(h.history["loss"]),"test_mae_m":float(m["mae"]),"test_mse":float(m["loss"]),"tensorflow":tf.__version__}
    except Exception as e: raise HTTPException(422,f"ML training failed: {e}")
    finally: td.cleanup()
