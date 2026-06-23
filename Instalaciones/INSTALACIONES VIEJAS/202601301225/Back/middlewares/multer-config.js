const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorio de uploads si no existe
const uploadDirs = [
  'uploads/taller/metales',
  'uploads/taller/header',
  'uploads/taller/refacciones',
  'uploads/taller/servicios'
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configurar almacenamiento para Metal Cliente
const storageMetalCliente = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/taller/metales';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const idMetalCliente = req.body.idMetalCliente;
    const ext = path.extname(file.originalname);
    const nombre = `${idMetalCliente}_${Date.now()}${ext}`;
    cb(null, nombre);
  }
});

// Configurar almacenamiento para Header del Taller
const storageTallerHeader = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/taller/header';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const idTaller = req.body.idTaller;
    const ext = path.extname(file.originalname);
    const nombre = `${idTaller}_${Date.now()}${ext}`;
    cb(null, nombre);
  }
});

// Filtro para validar que sea imagen
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se aceptan archivos de imagen (jpeg, png, gif, webp)'), false);
  }
};

// Crear instancia de multer para Metal Cliente
const uploadMetalCliente = multer({
  storage: storageMetalCliente,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// Crear instancia de multer para Header del Taller
const uploadTallerHeader = multer({
  storage: storageTallerHeader,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

module.exports = {
  uploadMetalCliente,
  uploadTallerHeader
};
