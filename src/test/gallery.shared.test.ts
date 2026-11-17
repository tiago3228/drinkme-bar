import { describe, expect, it } from "vitest";
import {
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_MAX_ITEMS,
  galleryUploadErrorMessage,
  parseGallerySettings,
  validateGalleryImage,
} from "@/features/gallery.shared";

const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;

describe("public gallery rules", () => {
  it("accepts JPEG, PNG and WebP images up to 5 MB", () => {
    expect(validateGalleryImage({ type: "image/jpeg", size: 1 })).toBe("");
    expect(validateGalleryImage({ type: "image/png", size: GALLERY_IMAGE_MAX_BYTES })).toBe("");
    expect(validateGalleryImage({ type: "image/webp", size: 1024 })).toBe("");
    expect(validateGalleryImage({ type: "image/gif", size: 1024 })).toContain("JPEG, PNG ou WebP");
    expect(
      validateGalleryImage({ type: "image/jpeg", size: GALLERY_IMAGE_MAX_BYTES + 1 }),
    ).toContain("5 MB");
    expect(validateGalleryImage({ type: "image/jpeg", size: 0 })).toContain("vazio");
  });

  it("keeps only valid unique gallery settings and trims text", () => {
    expect(
      parseGallerySettings([
        { resource_id: uuid(1), title: "  Negroni  ", description: "  Clássico  " },
        { resource_id: uuid(1), title: "Duplicado", description: "Ignorar" },
        { resource_id: "not-a-uuid", title: "Inválido", description: "Ignorar" },
        { resource_id: uuid(2), title: " ", description: "Sem título" },
        { resource_id: uuid(3), title: "Válido", description: "" },
      ]),
    ).toEqual([
      { resource_id: uuid(1), title: "Negroni", description: "Clássico" },
      { resource_id: uuid(3), title: "Válido", description: "" },
    ]);
  });

  it("limits the public list to 60 valid items", () => {
    const items = Array.from({ length: GALLERY_MAX_ITEMS + 1 }, (_, index) => ({
      resource_id: uuid(index + 1),
      title: `Drink ${index + 1}`,
      description: "",
    }));
    expect(parseGallerySettings(items)).toHaveLength(GALLERY_MAX_ITEMS);
  });

  it("maps private storage errors to actionable messages", () => {
    expect(galleryUploadErrorMessage({ statusCode: "401" })).toContain("sessão expirou");
    expect(galleryUploadErrorMessage({ statusCode: "413" })).toContain("5 MB");
    expect(galleryUploadErrorMessage({ statusCode: "415" })).toContain("JPEG, PNG ou WebP");
    expect(galleryUploadErrorMessage({ message: "Bucket not found" })).toContain("armazenamento");
  });
});
