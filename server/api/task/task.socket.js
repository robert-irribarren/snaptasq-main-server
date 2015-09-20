/**
 * Broadcast updates to client when the model changes
 */

'use strict';

var Task = require('./task.model');

exports.register = function(socket) {
    Task.schema.post('save', function(doc) {
        onSave(socket, doc);
    });
    Task.schema.post('remove', function(doc) {
        onRemove(socket, doc);
    });
}

function onSave(socket, doc, cb) {
    console.log("Emitting onsave", 'task:' + doc._id + ':save');
    socket.emit('task:' + doc._id + ':save', doc);
}

function onRemove(socket, doc, cb) {
    socket.emit('task:' + doc._id + ':remove', doc);
}
