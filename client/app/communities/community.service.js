/* global io */
'use strict';

angular.module('snaptasqApp')
    .factory('Community', function Community($resource, $http, $q) {

        var Comm = $resource('/api/communities/:id/:controller', {
            id: '@_id'
        }, {
            create: {
                method: 'POST',
                params: {
                    controller: ""
                }
            },
            update: {
                method: 'PUT',
                params: {
                    controller: ''
                }
            },
            getById: {
                method: 'GET',
                params: {
                    controller: ""
                }
            },
            get: {
                method: 'GET',
                isArray: true,
                params: {
                    controller: ""
                }
            },
        });
        return {
            delete: function(id, cb) {
                var cb = cb || angular.noop;
                var deferred = $q.defer();
                Comm.delete({
                    id: id
                }, function(data) {
                    deferred.resolve(data);
                    return cb(data);
                });
                return deferred.promise;
            },
            create: function(data, cb) {
                var cb = cb || angular.noop;
                var deferred = $q.defer();
                Comm.create({}, data, function(data) {
                    deferred.resolve(data);
                    if (cb)
                        return cb(data);
                });
                return deferred.promise;
            },
            getById: function(id, cb) {
                var cb = cb || angular.noop;
                var deferred = $q.defer();
                Comm.getById({
                    id: id
                }, {}, function(data) {
                    deferred.resolve(data);
                    return cb(data);
                });
                return deferred.promise;
            },
            get: function(filter, cb) {
                var cb = cb || angular.noop;
                var deferred = $q.defer();
                Comm.query(filter, {}, function(data) {
                    deferred.resolve(data);
                    return cb(data);
                });
                return deferred.promise;
            },
            isGroupOpen: function(id, cb) {
                var cb = cb || angular.noop;
                var deferred = $q.defer();
                Comm.getById({
                    id: id
                }, function(response) {
                    if (!response) {
                        deferred.resolve(false);
                        return cb(false);
                    }
                    var data = (response.entryMethod == "open");
                    deferred.resolve(data);
                    return cb(data);
                });
                return deferred.promise;
            },
            /**
             * A user can try to join a group
             * Will trigger success if the joining was accepted
             * Will trigger failure if the joining was rejected
             **/
            requestJoin: function(id, applicantId, creds, success, failure) {
                var failure = failure || angular.noop;
                var success = success || angular.noop;
                var deferred = $q.defer();
                $http({
                    method: "POST",
                    url: '/api/communities/' + id + '/requestJoin',
                    data: {
                        applicantId: applicantId,
                        creds: creds
                    }
                }).then(function(response) {
                    deferred.resolve(response);
                    return success(response);
                }, function(fail) {
                    deferred.reject(fail);
                    return failure(fail);
                });
                return deferred.promise;
            }
        };
    });