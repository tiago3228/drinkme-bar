type PublicImage = { path: string; mime_type: string; is_public: boolean };

// Signing is privileged: only validated public image rows may reach the signer.
export async function signPublicImage(
  resource: PublicImage | null,
  sign: (path: string, expiresIn: number) => Promise<string | undefined>,
) {
  if (
    !resource?.is_public ||
    !["image/jpeg", "image/png", "image/webp"].includes(resource.mime_type)
  ) {
    return undefined;
  }
  return sign(resource.path, 3600);
}
