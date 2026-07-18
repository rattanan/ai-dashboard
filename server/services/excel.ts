import * as XLSX from "xlsx";
import { failure, success } from "@/types/result";
import type { ObjectStorageService } from "@/server/storage/object-storage";

const EXTENSION = /\.(xlsx|xls)$/i;
const MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

export class ExcelUploadService {
  constructor(
    private readonly storage: ObjectStorageService,
    private readonly maxBytes = 10_485_760,
  ) {}

  async upload(file: File) {
    if (
      !EXTENSION.test(file.name) ||
      !MIME_TYPES.has(file.type || "application/octet-stream")
    )
      return failure("FILE_INVALID", "Choose an .xlsx or .xls workbook.");
    if (file.size <= 0 || file.size > this.maxBytes)
      return failure(
        "FILE_INVALID",
        `Workbook size must be between 1 byte and ${this.maxBytes} bytes.`,
      );
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(bytes, { type: "buffer", bookSheets: true });
      if (!workbook.SheetNames.length)
        return failure(
          "FILE_INVALID",
          "The workbook does not contain any sheets.",
        );
      const stored = await this.storage.put({ bytes, originalName: file.name });
      return success({
        ...stored,
        originalName: file.name,
        mimeType: file.type,
        sheetNames: workbook.SheetNames,
      });
    } catch {
      return failure(
        "FILE_INVALID",
        "The workbook could not be read. It may be damaged or password protected.",
      );
    }
  }
}
