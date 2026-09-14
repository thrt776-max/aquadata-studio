# AquaData Studio / THRBLACK10 Hydraulic Engine

Real hydraulic backend for THRBLACK10/AquaData Studio.

## Architecture

- Frontend: Leaflet + Chart.js + EPANET network editor
- Backend: FastAPI
- Hydraulic model: WNTR
- Solver: EPANET 2.2 toolkit
- Input: native EPANET `.inp`
- Output: JSON time series for pressure, head, demand, flow, velocity and headloss

## Run locally

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health: `GET /health`
Simulation: `POST /simulate`

The frontend can point to the backend with its FastAPI endpoint setting. The backend is intentionally separated from the Hatchable JavaScript isolate because EPANET 2.2/WNTR requires a Python runtime and the native EPANET toolkit.
