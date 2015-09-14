'use strict';

angular.module('snaptasqApp')
    .factory('User', function($resource, $http, $q, $cacheFactory) {
        var cacheMe = $cacheFactory('User');
        var Usr = $resource('/api/users/:id/:controller', {
            id: '@_id'
        }, {
            applyBetaCode: {
                method: 'POST',
                params: {
                    controller: 'applyBetaCode'
                }
            },
            changePassword: {
                method: 'PUT',
                params: {
                    controller: 'password'
                }
            },
            resetChangePassword: {
                method: 'PUT',
                params: {
                    controller: 'resetChangePassword'
                }
            },
            create: {
                method: 'POST',
                params: {
                    controller: ""
                }
            },
            sendVerificationEmail: {
                method: 'POST',
                params: {
                    controller: 'sendVerificationEmail'
                }
            },
            sendForgotPasswordEmail: {
                method: 'POST',
                params: {
                    controller: 'sendForgotPasswordEmail'
                }
            },
            deleteMyAccount: {
                method: 'DELETE',
                params: {
                    controller: 'deleteMyAccount'
                }
            },
            get: {
                method: 'GET',
                cache: cacheMe,
                params: {
                    id: 'me'
                }
            }
        });
        return {
            removeFriendship: function(id, cb, cberror) {
                var cb = cb || angular.noop;
                var cberror = cberror || angular.noop;
                $http.post('/api/users/' + id + '/removeFriendship').success(function(data) {
                    return cb(data);
                }).error(function(err) {
                    return cberror(err);
                });
            },
            makeFriendRequest: function(id, cb, cberror) {
                var cb = cb || angular.noop;
                var cberror = cberror || angular.noop;
                $http.post('/api/users/' + id + '/requestFriendship').success(function(data) {
                    return cb(data);
                }).error(function(err) {
                    return cberror(err);
                });
            },
            hasFacebookPermission: function(permission, cb) {
                $http.post('/api/users/me/permission', {
                    permission: permission
                }).success(function(data) {
                    return cb(true);
                }).error(function(err) {
                    return cb(false);
                });
            },
            searchByName: function(name, cb) {
                var cb = cb || angular.noop;
                $http.post('/api/users/search', {
                    name: name
                }).success(function(data) {
                    return cb(data);
                }).error(function(err) {
                    return cb(undefined);
                });
            },
            getById: function(id, cb) {
                var cb = cb || angular.noop;
                $http.get('/api/users/' + id).success(function(data) {
                    return cb(data);
                }).error(function(err) {
                    console.error(err);
                    return cb(undefined);
                });
            },
            /** You must have admin privlege for this **/
            getAllUsers: function(cb) {
                var cb = cb || angular.noop;
                $http.get('/api/users/').success(function(data) {
                    return cb(data);
                }).error(function(err) {
                    console.error(err);
                    return cb(undefined);
                });
            },
            removeCache: function() {
                cacheMe.removeAll();
            },
            get: Usr.get, //this guy is cached
            applyBetaCode: Usr.applyBetaCode,
            changePassword: Usr.changePassword,
            resetChangePassword: Usr.resetChangePassword,
            create: Usr.create,
            sendVerificationEmail: Usr.sendVerificationEmail,
            sendForgotPasswordEmail: Usr.sendForgotPasswordEmail,
            deleteMyAccount: Usr.deleteMyAccount,
        }
    });
