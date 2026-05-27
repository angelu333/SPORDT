-- ============================================================
-- SporDT - Gestor Integral de Academias y Ligas
-- Script de inicialización de Base de Datos (v2.0)
-- ============================================================
-- ADVERTENCIA: Este script ELIMINA y RECREA la base de datos.
-- Solo ejecutar en desarrollo o primera instalación.
-- ============================================================

DROP DATABASE IF EXISTS spordt_db;
CREATE DATABASE spordt_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE spordt_db;

-- ============================================================
-- 1. CONFIGURACIÓN DE TARIFAS
-- Mejoras: campo 'tipo' para distinguir inscripción vs mensualidad,
-- campo 'activo' para desactivar tarifas sin borrarlas.
-- ============================================================
CREATE TABLE tarifas (
    id_tarifa INT AUTO_INCREMENT PRIMARY KEY,
    concepto VARCHAR(100) NOT NULL,
    tipo ENUM('Inscripcion', 'Mensualidad', 'Otro') NOT NULL DEFAULT 'Mensualidad',
    monto DECIMAL(10,2) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. USUARIOS (Módulo de seguridad - compañeros de Ángel)
-- Sin cambios significativos, se respeta el diseño original.
-- ============================================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(30) NOT NULL DEFAULT 'Administrador',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. TUTORES
-- Mejoras: dirección de contacto, fecha de registro automática,
-- campo 'activo' para soft-delete (evita conflictos con FK de alumnos).
-- ============================================================
CREATE TABLE tutores (
    id_tutor INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    direccion TEXT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. CATEGORÍAS
-- Mejoras: descripción opcional para más contexto,
-- campo 'activo' para control administrativo.
-- ============================================================
CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL,
    edad_minima INT NOT NULL,
    edad_maxima INT NOT NULL,
    descripcion VARCHAR(255) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1
);

-- ============================================================
-- 5. ALUMNOS
-- Mejoras: género (importante para categorías deportivas),
-- CURP como identificador oficial mexicano (opcional),
-- fecha de inscripción automática, ENUM para estatus,
-- FKs con RESTRICT para proteger integridad referencial.
-- ============================================================
CREATE TABLE alumnos (
    id_alumno INT AUTO_INCREMENT PRIMARY KEY,
    id_tutor INT NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero ENUM('M', 'F') NULL COMMENT 'M=Masculino, F=Femenino',
    curp VARCHAR(18) NULL UNIQUE COMMENT 'Clave Única de Registro de Población',
    id_categoria INT NULL,
    estatus ENUM('Activo', 'Inactivo', 'Baja') NOT NULL DEFAULT 'Activo',
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_tutor) REFERENCES tutores(id_tutor)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
        ON DELETE SET NULL ON UPDATE CASCADE,
    
    INDEX idx_alumno_tutor (id_tutor),
    INDEX idx_alumno_categoria (id_categoria),
    INDEX idx_alumno_estatus (estatus)
);

-- ============================================================
-- 6. EQUIPOS EXTERNOS (Módulo de liga - compañeros de Ángel)
-- Sin cambios, se respeta el diseño original.
-- ============================================================
CREATE TABLE equipos_externos (
    id_equipo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_equipo VARCHAR(100) NOT NULL,
    nombre_delegado VARCHAR(150) NOT NULL,
    telefono_delegado VARCHAR(20) NOT NULL
);

-- ============================================================
-- 7. TORNEOS (Módulo de liga - compañeros de Ángel)
-- Mejora menor: ENUM para estatus en vez de VARCHAR libre.
-- ============================================================
CREATE TABLE torneos (
    id_torneo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_torneo VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estatus ENUM('Planificacion', 'En curso', 'Finalizado', 'Cancelado') NOT NULL DEFAULT 'Planificacion'
);

-- ============================================================
-- 8. CARGOS FINANCIEROS (Cobranza)
-- Mejoras: fecha de generación automática, periodo de cobro
-- (ej: "2026-06" para junio), notas opcionales,
-- ENUM para estatus, índice compuesto para búsquedas rápidas.
-- ============================================================
CREATE TABLE cargos_financieros (
    id_cargo INT AUTO_INCREMENT PRIMARY KEY,
    tipo_entidad ENUM('Alumno', 'Equipo') NOT NULL COMMENT 'A quién se le cobra',
    id_entidad INT NOT NULL COMMENT 'FK polimórfica: id_alumno o id_equipo',
    concepto VARCHAR(100) NOT NULL,
    monto_total DECIMAL(10,2) NOT NULL,
    monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estatus_pago ENUM('Pendiente', 'Parcial', 'Pagado', 'Vencido') NOT NULL DEFAULT 'Pendiente',
    fecha_vencimiento DATE NOT NULL,
    periodo VARCHAR(20) NULL COMMENT 'Periodo de cobro, ej: 2026-06',
    notas TEXT NULL,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_cargo_entidad (tipo_entidad, id_entidad),
    INDEX idx_cargo_estatus (estatus_pago),
    INDEX idx_cargo_vencimiento (fecha_vencimiento)
);

-- ============================================================
-- 9. HISTORIAL DE ABONOS
-- Mejoras: método de pago, quién recibió el pago,
-- notas opcionales para referencia de transferencia, etc.
-- ============================================================
CREATE TABLE historial_abonos (
    id_abono INT AUTO_INCREMENT PRIMARY KEY,
    id_cargo INT NOT NULL,
    monto_abonado DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Transferencia', 'Tarjeta', 'Otro') NOT NULL DEFAULT 'Efectivo',
    recibido_por VARCHAR(100) NULL COMMENT 'Nombre de quién recibió el pago',
    notas TEXT NULL COMMENT 'Referencia bancaria, observaciones, etc.',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_cargo) REFERENCES cargos_financieros(id_cargo)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_abono_cargo (id_cargo)
);


-- ============================================================
-- DATOS SEMILLA (Seed Data)
-- Datos iniciales útiles para empezar a trabajar de inmediato.
-- ============================================================

-- Categorías deportivas por rango de edad
INSERT INTO categorias (nombre_categoria, edad_minima, edad_maxima, descripcion) VALUES
('Sub-6',   4,  6,  'Iniciación deportiva, niños de 4 a 6 años'),
('Sub-8',   7,  8,  'Formación básica, niños de 7 a 8 años'),
('Sub-10',  9,  10, 'Desarrollo técnico, niños de 9 a 10 años'),
('Sub-12',  11, 12, 'Pre-competitiva, niños de 11 a 12 años'),
('Sub-14',  13, 14, 'Competitiva juvenil, adolescentes de 13 a 14 años'),
('Sub-16',  15, 16, 'Competitiva juvenil mayor, adolescentes de 15 a 16 años'),
('Sub-18',  17, 18, 'Juvenil superior, jóvenes de 17 a 18 años');

-- Tarifas por defecto
INSERT INTO tarifas (concepto, tipo, monto) VALUES
('Inscripción nueva',  'Inscripcion',  500.00),
('Mensualidad regular', 'Mensualidad', 350.00);
