import { trainingCatalogSchema, type TrainingRecord } from "@uh/contracts";
import data from "./data/training-shanghai.json";
export const defaultTrainingCatalog = trainingCatalogSchema.parse(data);
export const defaultTrainingRecord: TrainingRecord = {
  draft: defaultTrainingCatalog,
  published: defaultTrainingCatalog,
  version: 1,
};
