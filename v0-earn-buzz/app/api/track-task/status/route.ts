// The dashboard/full-game clients poll GET /api/track-task/status?userId=&plan=
// for per-plan progress. The handler lives on the sibling route (same query
// params); re-exported here so the sub-path resolves instead of 404ing.
export { GET } from "../route";
