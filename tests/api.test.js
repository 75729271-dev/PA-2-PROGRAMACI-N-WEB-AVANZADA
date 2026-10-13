/**
 * Pruebas de integración de la API (node:test + supertest).
 * Usan una base de datos de prueba separada (MONGO_URI_TEST) que se limpia al inicio.
 * Ejecutar: npm test
 */
require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'clave_solo_para_pruebas';

const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');

const app = require('../src/app');
const { conectarDB, desconectarDB } = require('../src/config/db');
const Usuario = require('../src/models/Usuario');

const URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/solicitudes_academicas_test';

const ctx = {};

before(async () => {
    await conectarDB(URI);
    await mongoose.connection.dropDatabase();
    await Usuario.syncIndexes(); // índice único de email

    // El administrativo no se puede registrar por la ruta pública: se crea directo
    await Usuario.create({
        nombre: 'Admin Pruebas',
        email: 'admin@test.com',
        password: 'admin123',
        rol: 'administrativo'
    });
});

after(async () => {
    await mongoose.connection.dropDatabase();
    await desconectarDB();
});

describe('Servidor y middleware', () => {
    test('GET / responde que la API funciona', async () => {
        const res = await request(app).get('/');
        assert.equal(res.status, 200);
        assert.match(res.body.mensaje, /funcionando/);
    });

    test('Ruta inexistente devuelve 404', async () => {
        const res = await request(app).get('/api/no-existe');
        assert.equal(res.status, 404);
    });

    test('JSON mal formado devuelve 400', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send('{"email": ');
        assert.equal(res.status, 400);
    });

    test('CORS permite el origen configurado y bloquea otros', async () => {
        const ok = await request(app).get('/').set('Origin', 'http://localhost:5173');
        assert.equal(ok.headers['access-control-allow-origin'], 'http://localhost:5173');

        const bloqueado = await request(app).get('/').set('Origin', 'http://sitio-malicioso.com');
        assert.equal(bloqueado.status, 403);
    });
});

describe('Autenticación (JWT + bcrypt)', () => {
    test('Registro crea un estudiante y devuelve token', async () => {
        const res = await request(app).post('/api/auth/registro').send({
            nombre: 'Ana Estudiante',
            email: 'ana@test.com',
            password: 'clave123',
            rol: 'administrativo' // se ignora: el registro público siempre es estudiante
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.usuario.rol, 'estudiante');
        assert.equal(res.body.usuario.password, undefined);
        assert.ok(res.body.token);
        ctx.tokenAna = res.body.token;
    });

    test('La contraseña se guarda cifrada con bcrypt', async () => {
        const u = await Usuario.findOne({ email: 'ana@test.com' }).select('+password');
        assert.notEqual(u.password, 'clave123');
        assert.match(u.password, /^\$2[aby]\$10\$/);
    });

    test('Email duplicado devuelve 409', async () => {
        const res = await request(app).post('/api/auth/registro').send({
            nombre: 'Ana Otra', email: 'ana@test.com', password: 'clave123'
        });
        assert.equal(res.status, 409);
    });

    test('Datos inválidos devuelven 400 con errores de Mongoose', async () => {
        const res = await request(app).post('/api/auth/registro').send({
            nombre: 'Al', email: 'no-es-email', password: '1'
        });
        assert.equal(res.status, 400);
        assert.ok(res.body.errores.length >= 3);
    });

    test('Login con contraseña incorrecta devuelve 401', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'ana@test.com', password: 'equivocada'
        });
        assert.equal(res.status, 401);
    });

    test('Login correcto (admin y segundo estudiante)', async () => {
        const admin = await request(app).post('/api/auth/login').send({
            email: 'admin@test.com', password: 'admin123'
        });
        assert.equal(admin.status, 200);
        ctx.tokenAdmin = admin.body.token;

        const luis = await request(app).post('/api/auth/registro').send({
            nombre: 'Luis Estudiante', email: 'luis@test.com', password: 'clave123'
        });
        ctx.tokenLuis = luis.body.token;
    });

    test('Ruta protegida sin token devuelve 401', async () => {
        const res = await request(app).get('/api/solicitudes');
        assert.equal(res.status, 401);
    });

    test('Token alterado devuelve 401', async () => {
        const res = await request(app)
            .get('/api/auth/perfil')
            .set('Authorization', `Bearer ${ctx.tokenAna}x`);
        assert.equal(res.status, 401);
    });

    test('GET /api/auth/perfil devuelve el usuario del token', async () => {
        const res = await request(app)
            .get('/api/auth/perfil')
            .set('Authorization', `Bearer ${ctx.tokenAna}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.email, 'ana@test.com');
    });
});

describe('CRUD de solicitudes con persistencia y roles', () => {
    const auth = token => ({ Authorization: `Bearer ${token}` });

    test('CREATE: estudiante registra una solicitud', async () => {
        const res = await request(app)
            .post('/api/solicitudes')
            .set(auth(ctx.tokenAna))
            .send({
                tipo: 'Retiro de curso',
                asunto: 'Retiro de Cálculo',
                descripcion: 'Solicito el retiro del curso de Cálculo por cruce de horario laboral.'
            });
        assert.equal(res.status, 201);
        assert.equal(res.body.solicitud.estado, 'Pendiente');
        ctx.idSolicitud = res.body.solicitud._id;
    });

    test('CREATE: tipo no permitido devuelve 400', async () => {
        const res = await request(app)
            .post('/api/solicitudes')
            .set(auth(ctx.tokenAna))
            .send({ tipo: 'Vacaciones', asunto: 'x', descripcion: 'descripcion valida larga' });
        assert.equal(res.status, 400);
    });

    test('CREATE: el administrativo no puede crear solicitudes (403)', async () => {
        const res = await request(app)
            .post('/api/solicitudes')
            .set(auth(ctx.tokenAdmin))
            .send({ tipo: 'Otro', asunto: 'Prueba', descripcion: 'No debería poder crearla' });
        assert.equal(res.status, 403);
    });

    test('READ: el registro persiste en MongoDB', async () => {
        const doc = await mongoose.connection.collection('solicitudes')
            .findOne({ _id: new mongoose.Types.ObjectId(ctx.idSolicitud) });
        assert.ok(doc);
        assert.equal(doc.asunto, 'Retiro de Cálculo');
    });

    test('READ: estudiante ve solo sus solicitudes; admin ve todas', async () => {
        await request(app).post('/api/solicitudes').set(auth(ctx.tokenLuis)).send({
            tipo: 'Constancia de estudios', asunto: 'Constancia', descripcion: 'Constancia para mi trabajo.'
        });

        const ana = await request(app).get('/api/solicitudes').set(auth(ctx.tokenAna));
        assert.equal(ana.body.total, 1);

        const admin = await request(app).get('/api/solicitudes').set(auth(ctx.tokenAdmin));
        assert.equal(admin.body.total, 2);
        assert.equal(admin.body.solicitudes[0].estudiante.nombre !== undefined, true);
    });

    test('READ: filtro por estado', async () => {
        const res = await request(app)
            .get('/api/solicitudes?estado=Aprobada')
            .set(auth(ctx.tokenAdmin));
        assert.equal(res.body.total, 0);
    });

    test('READ: otro estudiante no puede ver la solicitud (403)', async () => {
        const res = await request(app)
            .get(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenLuis));
        assert.equal(res.status, 403);
    });

    test('READ: id inválido devuelve 400', async () => {
        const res = await request(app).get('/api/solicitudes/123').set(auth(ctx.tokenAna));
        assert.equal(res.status, 400);
    });

    test('UPDATE: el dueño edita su solicitud pendiente', async () => {
        const res = await request(app)
            .put(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenAna))
            .send({ asunto: 'Retiro de Cálculo (sección B)', estado: 'Aprobada' });
        assert.equal(res.status, 200);
        assert.equal(res.body.solicitud.asunto, 'Retiro de Cálculo (sección B)');
        assert.equal(res.body.solicitud.estado, 'Pendiente'); // el estudiante no cambia el estado
    });

    test('UPDATE: estudiante no puede cambiar estado (403)', async () => {
        const res = await request(app)
            .patch(`/api/solicitudes/${ctx.idSolicitud}/estado`)
            .set(auth(ctx.tokenAna))
            .send({ estado: 'Aprobada' });
        assert.equal(res.status, 403);
    });

    test('UPDATE: administrativo atiende la solicitud', async () => {
        const res = await request(app)
            .patch(`/api/solicitudes/${ctx.idSolicitud}/estado`)
            .set(auth(ctx.tokenAdmin))
            .send({ estado: 'Aprobada', respuesta: 'Retiro procesado.' });
        assert.equal(res.status, 200);
        assert.equal(res.body.solicitud.estado, 'Aprobada');
        assert.equal(res.body.solicitud.atendidaPor.email, 'admin@test.com');
    });

    test('UPDATE: estado inválido devuelve 400', async () => {
        const res = await request(app)
            .patch(`/api/solicitudes/${ctx.idSolicitud}/estado`)
            .set(auth(ctx.tokenAdmin))
            .send({ estado: 'Archivada' });
        assert.equal(res.status, 400);
    });

    test('UPDATE/DELETE: solicitud ya atendida no la cambia el estudiante (409)', async () => {
        const put = await request(app)
            .put(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenAna))
            .send({ asunto: 'Cambio tardío' });
        assert.equal(put.status, 409);

        const del = await request(app)
            .delete(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenAna));
        assert.equal(del.status, 409);
    });

    test('DELETE: administrativo elimina y ya no existe en la BD', async () => {
        const res = await request(app)
            .delete(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenAdmin));
        assert.equal(res.status, 200);

        const otra = await request(app)
            .get(`/api/solicitudes/${ctx.idSolicitud}`)
            .set(auth(ctx.tokenAdmin));
        assert.equal(otra.status, 404);
    });
});

describe('Gestión de usuarios (solo administrativo)', () => {
    test('Estudiante no accede a /api/usuarios (403)', async () => {
        const res = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${ctx.tokenAna}`);
        assert.equal(res.status, 403);
    });

    test('Administrativo lista usuarios sin exponer contraseñas', async () => {
        const res = await request(app)
            .get('/api/usuarios')
            .set('Authorization', `Bearer ${ctx.tokenAdmin}`);
        assert.equal(res.status, 200);
        assert.equal(res.body.total, 3);
        assert.ok(res.body.usuarios.every(u => u.password === undefined));
    });

    test('Usuario desactivado ya no puede usar su token (401)', async () => {
        const luis = await Usuario.findOne({ email: 'luis@test.com' });
        await request(app)
            .put(`/api/usuarios/${luis._id}`)
            .set('Authorization', `Bearer ${ctx.tokenAdmin}`)
            .send({ activo: false });

        const res = await request(app)
            .get('/api/solicitudes')
            .set('Authorization', `Bearer ${ctx.tokenLuis}`);
        assert.equal(res.status, 401);
    });
});
