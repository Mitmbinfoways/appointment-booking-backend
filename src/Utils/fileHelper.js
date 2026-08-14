const fs = require("fs");
const path = require("path");

const processBase64Responses = (dynamicResponses, req) => {
  if (!dynamicResponses || typeof dynamicResponses !== "object") {
    return dynamicResponses;
  }

  const processed =
    dynamicResponses instanceof Map
      ? Object.fromEntries(dynamicResponses)
      : { ...dynamicResponses };

  const uploadsDir = path.join(__dirname, "..", "..", "public", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const protocol = req?.protocol || "http";
  const host = (req?.get && req.get("host")) || "localhost:5000";
  const baseUrl = `${protocol}://${host}`;

  Object.keys(processed).forEach((key) => {
    const val = processed[key];
    if (typeof val === "string" && val.startsWith("data:")) {
      const matches = val.match(
        /^data:([a-zA-Z0-9-+\/]+);base64,(.+)$/,
      );
      if (matches && matches[2]) {
        const mimeType = matches[1];
        const base64Data = matches[2];
        let ext = "bin";
        if (mimeType.includes("video/mp4")) ext = "mp4";
        else if (mimeType.includes("video/webm")) ext = "webm";
        else if (mimeType.includes("video/quicktime")) ext = "mov";
        else if (
          mimeType.includes("image/jpeg") ||
          mimeType.includes("image/jpg")
        )
          ext = "jpg";
        else if (mimeType.includes("image/png")) ext = "png";
        else if (mimeType.includes("image/gif")) ext = "gif";
        else if (mimeType.includes("image/webp")) ext = "webp";
        else {
          const parts = mimeType.split("/");
          if (parts[1]) ext = parts[1].replace(/[^a-zA-Z0-9]/g, "");
        }

        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(base64Data, "base64");
        fs.writeFileSync(filePath, buffer);

        processed[key] = `${baseUrl}/uploads/${filename}`;
      }
    }
  });

  return processed;
};

module.exports = {
  processBase64Responses,
};
