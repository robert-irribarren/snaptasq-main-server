 'use strict';
 /* /api/communities */
 var express = require('express');
 var controller = require('./community.controller');
 var auth = require('../../auth/auth.service');
 var dsl = require('../../components/dsl');


 var router = express.Router();

 router.post('/', auth.hasRole('admin'), controller.create);
 router.get('/', auth.isAuthenticated(), controller.index);
 router.get('/:id/tasks', auth.isAuthenticated(), dsl.processSearch, controller.getTasks);
 //router.get('/me', auth.isAuthenticated(), controller.getMine);
 router.get('/:id', controller.show);
 router.get('/:id/amIMember', auth.isAuthenticated(), controller.amIMember); //auth.isAuthenticated() removed on purpose
 router.get('/:id/join/:encUserId', controller.join);
 router.post('/:id/requestJoin', auth.isAuthenticated(), controller.requestJoin);
 router.post('/search', controller.search);
 router.delete('/:id', auth.hasRole('admin'), controller.destroy);

 //no need to use DSL
 router.get('/user/:id', auth.isAuthenticated(), controller.getCommunitiesByUser);

 module.exports = router;
