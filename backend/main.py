from __future__ import annotations

import tempfile
from pathlib import Path

import wntr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from ml_router import router as ml_router

app = FastAPI(title="THRBLACK10 Hydraulic Engine", version="2.0.0")
app.include_router(ml_router)

class SimulationRequest(BaseModel):
    inp: str = Field(min_length=20)
    duration_hours: float = Field(default=24, gt=0, le=720)
    hydraulic_timestep_hours: float = Field(default=1, gt=0, le=24)
    demand_model: str = Field(default="DD")

def _run(inp: str, duration_hours: float, timestep_hours: float, demand_model: str):
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "network.inp"
        path.write_text(inp, encoding="utf-8")
        try: wn = wntr.network.WaterNetworkModel(str(path))
        except Exception as exc: raise HTTPException(422, f"INP EPANET invalide: {exc}") from exc
        wn.options.time.duration = int(duration_hours * 3600)
        wn.options.time.hydraulic_timestep = int(timestep_hours * 3600)
        wn.options.time.report_timestep = int(timestep_hours * 3600)
        if demand_model.upper() in {"DD", "PDD"}: wn.options.hydraulic.demand_model = demand_model.upper()
        try: results = wntr.sim.EpanetSimulator(wn).run_sim(version=2.2, convergence_error=True)
        except Exception as exc: raise HTTPException(422, f"EPANET 2.2 simulation failed: {exc}") from exc
        nodes={}; links={}
        for frame,key in [(results.node["pressure"],"pressure"),(results.node["head"],"head"),(results.node["demand"],"demand")]:
            for c in frame.columns: nodes.setdefault(str(c),{})[key]=[float(x) for x in frame[c].tolist()]
        for frame,key in [(results.link["flowrate"],"flow"),(results.link["velocity"],"velocity"),(results.link["headloss"],"headloss")]:
            for c in frame.columns: links.setdefault(str(c),{})[key]=[float(x) for x in frame[c].tolist()]
        times=[float(t.total_seconds()/3600) for t in results.node["pressure"].index]
        return {"engine":"WNTR / EPANET 2.2","periods":len(times),"times_h":times,"nodes":[{"id":k,**v} for k,v in nodes.items()],"links":[{"id":k,**v} for k,v in links.items()],"warnings":[]}

@app.get("/health")
def health(): return {"status":"ok","engine":"WNTR / EPANET 2.2"}

@app.post("/simulate")
def simulate(req: SimulationRequest): return _run(req.inp,req.duration_hours,req.hydraulic_timestep_hours,req.demand_model)
