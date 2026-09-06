export interface ReviewDimensionItem {
  id?: number | null;
  templateVersionId?: number | null;
  dimensionKey: string;
  dimensionName: string;
  dimensionDesc?: string | null;
  weight: number;
  scoreMin: number;
  scoreMax: number;
  passThreshold?: number | null;
  rejectThreshold?: number | null;
  promptInstruction?: string | null;
  manualReviewHint?: string | null;
  severityLevel: string;
  sortNo: number;
  requiredFlag: number;
}

export interface DimensionPackOption {
  id: number;
  packCode: string;
  packName: string;
  packDesc?: string;
}
