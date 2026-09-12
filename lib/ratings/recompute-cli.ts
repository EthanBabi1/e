import { recomputeAllRatings } from "./recompute";

recomputeAllRatings()
  .then((r) => {
    console.log(`Recomputed ${r.racesProcessed} races across ${r.classesProcessed} classes.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
