const { response } = require('express');
const { Op, Sequelize } = require('sequelize');
const ServicioExterno = require('../models/ServicioExterno');
const moment = require('moment');
const db = require('../database/config');

// CRUD DE SERVICIOS EXTERNOS CON SEQUELIZE

// Obtener lista de servicios externos con paginación
const getServiciosExternosListWithPage = async(req, res = response) => {
    const {
        search = '',
        limiter = 10,
        start = 0
    } = req.body;

    try {
        const where = {
            active: { [Op.eq]: 1 }
        };

        if (search && search.trim() !== '') {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        const total = await ServicioExterno.count({ where });
        const servicios = await ServicioExterno.findAll({
            where,
            limit: parseInt(limiter),
            offset: parseInt(start),
            order: [['idServicioExterno', 'DESC']]
        });

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                count: total,
                rows: servicios.map(s => ({
                    idServicioExterno: s.idServicioExterno,
                    name: s.name,
                    description: s.description
                }))
            }
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

// Obtener un servicio externo por ID
const getServicioExternoByID = async(req, res = response) => {
    const {
        idServicioExterno
    } = req.body;

    try {
        const servicio = await ServicioExterno.findOne({
            where: {
                idServicioExterno: parseInt(idServicioExterno),
                active: { [Op.eq]: 1 }
            }
        });

        if (!servicio) {
            res.json({
                status: 1,
                message: "No se encontró el servicio externo.",
                data: null
            });
        } else {
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: {
                    idServicioExterno: servicio.idServicioExterno,
                    name: servicio.name,
                    description: servicio.description
                }
            });
        }
    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

// Insertar o actualizar servicio externo
const insertUpdateServicioExterno = async(req, res = response) => {
    const {
        idServicioExterno = 0,
        name = '',
        description = ''
    } = req.body;

    try {
        let servicio;

        if (parseInt(idServicioExterno) > 0) {
            // Actualizar
            servicio = await ServicioExterno.findByPk(parseInt(idServicioExterno));
            if (!servicio) {
                return res.json({
                    status: 1,
                    message: "No se encontró el servicio externo."
                });
            }

            await servicio.update({
                name: name,
                description: description
            });

            res.json({
                status: 0,
                message: "Servicio externo actualizado correctamente.",
                data: {
                    idServicioExterno: servicio.idServicioExterno
                }
            });

        } else {
            // Insertar
            servicio = await ServicioExterno.create({
                name: name,
                description: description,
                active: 1,
                createDate: new Date()
            });

            res.json({
                status: 0,
                message: "Servicio externo creado correctamente.",
                data: {
                    idServicioExterno: servicio.idServicioExterno
                }
            });
        }

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

// Eliminar servicio externo (soft delete - marcar como inactivo)
const deleteServicioExterno = async(req, res = response) => {
    const {
        idServicioExterno
    } = req.body;

    try {
        const servicio = await ServicioExterno.findByPk(parseInt(idServicioExterno));

        if (!servicio) {
            return res.json({
                status: 1,
                message: "No se encontró el servicio externo."
            });
        }

        await servicio.update({
            active: 0
        });

        res.json({
            status: 0,
            message: "Servicio externo eliminado correctamente."
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

// Obtener combo de servicios externos (para el select en el formulario de taller)
const cbxGetServiciosExternos = async(req, res = response) => {
    const {
        search = ''
    } = req.body;

    try {
        const where = {
            active: { [Op.eq]: 1 }
        };

        if (search && search.trim() !== '') {
            where.name = { [Op.like]: `%${search}%` };
        }

        const servicios = await ServicioExterno.findAll({
            where,
            order: [['idServicioExterno', 'DESC']],
            limit: 50
        });

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: servicios.map(s => ({
                idServicioExterno: s.idServicioExterno,
                name: s.name,
                description: s.description
            }))
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

module.exports = {
    getServiciosExternosListWithPage,
    getServicioExternoByID,
    insertUpdateServicioExterno,
    deleteServicioExterno,
    cbxGetServiciosExternos
};

