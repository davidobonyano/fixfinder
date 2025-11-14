const normalizeStatus = (status) => {
  if (!status) return "";
  return String(status).toLowerCase();
};

const resolveSource = (entity) => {
  if (!entity) return {};
  return entity.user || entity;
};

export const getVerificationState = (entity) => {
  const source = resolveSource(entity);
  const emailVerified =
    source?.emailVerification?.isVerified ??
    entity?.emailVerification?.isVerified ??
    false;

  const faceStatus =
    normalizeStatus(source?.faceVerification?.status) ||
    normalizeStatus(entity?.faceVerification?.status);
  const faceVerified = faceStatus === "verified";

  const fallbackFullyVerified = Boolean(
    source?.isVerified ||
      source?.verified ||
      entity?.isVerified ||
      entity?.verified
  );

  if (fallbackFullyVerified) {
    return {
      emailVerified: true,
      faceVerified: true,
      fullyVerified: true,
    };
  }

  const fullyVerified = Boolean(emailVerified && faceVerified);

  return {
    emailVerified: Boolean(emailVerified),
    faceVerified,
    fullyVerified,
  };
};

export const isFullyVerifiedProfessional = (entity) => getVerificationState(entity).fullyVerified;

