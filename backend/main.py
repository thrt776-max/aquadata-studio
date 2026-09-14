from __future__ import annotations

import tempfile
from pathlib import Path

import wntr
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="THRBLACK10 Hydraulic Engine", version="1.0.0")


class SimulationRequest(BaseModel):
    inp: str = Field(min_length=20)
    duration_hours: float = Field(default=24, gt=0, le=720)
    hydraulic_timestep_hours: float = Field(default=1, gt=0, le=24)
    demand_model: str = Field(default="DD")


def _series(results, variable, kind):
    frame = getattr(results, kind, None)
    if frame is None:
        return []
    return [
        {"id": str(node_id), variable: [float(v) for v in frame[node_id].tolist()]}
        for node_id in frame.columns
    ]


def _run(inp: str, duration_hours: float, timestep_hours: float, demand_model: str):
    with tempfile.TemporaryDirectory() as td:
        path = Path(td) / "network.inp"
        path.write_text(inp, encoding="utf-8")
        try:
            wn = wntr.network.WaterNetworkModel(str(path))
        except Exception as exc:
            raise HTTPException(422, f"INP EPANET invalide: {exc}") from exc

        wn.options.time.duration = int(duration_hours * 3600)
        wn.options.time.hydraulic_timestep = int(timestep_hours * 3600)
        wn.options.time.report_timestep = int(timestep_hours * 3600)
        if demand_model.upper() in {"DD", "PDD"}:
            wn.options.hydraulic.demand_model = demand_model.upper()

        try:
            sim = wntr.sim.EpanetSimulator(wn)
            results = sim.run_sim(version=2.2, convergence_error=True)
        except Exception as exc:
            raise HTTPException(422, f"EPANET 2.2 simulation failed: {exc}") from exc

        pressure = _series(results.node, "pressure", "pressure")
        head = _series(results.node, "head", "head")
        demand = _series(results.node, "demand", "demand")
        flow = _series(results.link, "flow", "flowrate")
        velocity = _series(results.link, "velocity", "velocity")
        headloss = _series(results.link, "headloss", "headloss")

        nodes = {}
        for row in pressure + head + demand:
            nodes.setdefault(row["id"], {}).update(row)
        links = {}
        for row in flow + velocity + headloss:
            links.setdefault(row["id"], {}).update(row)

        times = [float(t.total_seconds() / 3600) for t in results.node["pressure"].index]
        return {
            "engine": "WNTR / EPANET 2.2",
            "periods": len(times),
            "times_h": times,
            "nodes": list(nodes.values()),
            "links": list(links.values()),
            "warnings": [],
        }


@app.get("/health")
def health():
    return {"status": "ok", "engine": "WNTR / EPANET 2.2"}


@app.post("/simulate")
def simulate(req: SimulationRequest):
    return _run(req.inp, req.duration_hours, req.hydraulic_timestep_hours, req.demand_model)
