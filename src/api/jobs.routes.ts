import { Router } from "express";
import { JobsController } from "@/api/jobs.controller";

export function createJobsRouter(controller: JobsController) {
  const router = Router();

  router.post("/jobs", controller.createJob);
  router.post("/jobs/:jobId/run", controller.runJob);
  router.get("/jobs/:jobId", controller.getJob);
  router.get("/jobs/:jobId/versions/:version", controller.getVersion);
  router.post("/jobs/:jobId/rewrite", controller.rewriteJob);
  router.get("/jobs/:jobId/preview", controller.getPreview);
  router.post("/jobs/:jobId/export", controller.exportJob);

  return router;
}
