const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = (folderName) => multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, "../../public", folderName);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = (folderName) => multer({ storage: storage(folderName) });

module.exports = upload;
