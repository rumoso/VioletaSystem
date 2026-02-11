const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Crear directorio si no existe
const uploadDir = path.join(__dirname, '../uploads/taller/metales');

if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar almacenamiento en disco
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + Date.now() + ext);
    }
});

// Configurar multer con validaciones
const uploadMetalClienteImage = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'));
        }
    }
}).single('file');

module.exports = {
    uploadMetalClienteImage,
    uploadDir
};
