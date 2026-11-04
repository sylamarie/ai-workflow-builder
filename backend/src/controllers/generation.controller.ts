import type { NextFunction, Request, Response } from "express";
import * as generationService from "../services/generation.service.js";
import { HttpError } from "../middleware/errorHandler.js";

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const generateWorkflow = asyncHandler(async (req, res) => {
  const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";

  if (!description) {
    throw new HttpError(400, "A description is required.");
  }
  if (description.length > generationService.MAX_DESCRIPTION_LENGTH) {
    throw new HttpError(
      400,
      `Description is too long (max ${generationService.MAX_DESCRIPTION_LENGTH} characters).`,
    );
  }

  const result = await generationService.generateWorkflow(description);
  res.status(200).json(result);
});
