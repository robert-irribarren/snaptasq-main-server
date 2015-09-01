'use strict';
var Notify = require('../notify/notify.controller');
var Emailer = require('../email/email.controller');
var User = require('../user/user.model');
var passport = require('passport');
var config = require('../../config/environment');
var jwt = require('jsonwebtoken');
var uuid = require('uuid');
var graph = require('fbgraph');
var sha1 = require('sha1');
//var notify = require('../notify/notify.controller');

var validationError = function(res, err) {
    return res.json(422, err);
};

/**
 * Get list of users
 * restriction: 'admin'
 */
exports.index = function(req, res) {
    User.find({}, '-salt -hashedPassword -verification.code -forgotPassCode', function(err, users) {
        if (err) return res.send(500, err);
        res.json(200, users);
    });
};

/**
 * Creates a new user
 */
exports.create = function(req, res, next) {
    var newUser = new User(req.body);
    newUser.accountName = newUser.name;
    newUser.provider = 'local';
    newUser.role = 'user';
    newUser.verification.code = uuid.v4();
    newUser.forgotPassCode = uuid.v4();
    newUser.requiresBeta = config.betaTrails;
    if (config.dontRequireEmailVerification) {
        newUser.verification.status = true;
    }
    newUser.save(function(err, user) {
        if (err) return validationError(res, err);
        var token = jwt.sign({
            _id: user._id
        }, config.secrets.session, {
            expiresInMinutes: 60 * 5
        });
        req.session.userId = user._id;
        req.session.save();
        //(toId,code,params,link,cb)
        Notify.put(user._id, "ACCOUNT_CREATE_NEW", {
            name: user.name
        }, undefined);
        User.findById(user._id, function(err, user) {
            if (err || user == null) {
                return res.status(500).json({
                    status: "error",
                    message: "We Couldn't find your account."
                });
                return;
            }
            if (user.verification.status == false) {
                Emailer.resendVerificationSilent(user.email, user.verification.code);
            }
            res.json({
                token: token,
                user: user
            });
        });

    });
};


exports.applyBetaCode = function(req, res, next) {
        if (!req.session.userId) {
            return res.send(401); //they need to relogin
        }
        //if (req.param('id')!=req.session.userId){
        //  return res.send(500);
        //}
        User.findOne({
            _id: req.session.userId
        }, function(err, user) {
            if (err) validationError(res, err);
            if (!user) return res.status(500).json({
                message: "Please login again"
            });
            if (!user.requiresBeta) return res.status(200).json({
                message: "Success, you have already entered a beta code!"
            });
            user.requiresBeta = false;
            user.save(function(err) {
                if (err) return validationError(res, err);
                Notify.put(user._id, "BETA_CODE_REGISTER_SUCCESS", {
                    name: user.name
                }, undefined);
                return next();
            });
        });
    }
    /**
     * Sends an invitation to another user to accept friend
     * Request
     */
exports.askFriend = function(req, res, next) {
    var targetFriendId = req.param('id');
    if (targetFriendId == undefined)
        return res.status(500).json({
            message: "Missing friend id to add, failed to add friend."
        });

    var myId = req.user._id;
    User.findOne({
        _id: myId
    }, '-salt -hashedPassword -verification.code -forgotPassCode', function(err, user) { // don't ever give out the password or salt
        if (err) return next(err);
        if (!user) return res.json(401);
        //test the accessToken if it expired then have them relog
        User.findOne({
            _id: targetFriendId
        }, function(err, friend) {
            if (err) validationError(res, err);
            return res.status(200).json("todo");
        });
        /*if (user.isConnectedWithFb && user.fb.accessToken){
          graph.get("/me?access_token="+user.fb.accessToken, function(err, data) {
              if (err){
                //this means that the token is no longer valid and will require the user to reconnect
                //to make them reconnect we should send a message back
              user.isConnectedWithFb = false;
              user.save(function(err) {
                if (err) return validationError(res, err);
                return res.send(200);
              });
              } else {
                var response = user;
                if (response.fb)
                  response.fb = undefined;
                return res.json(response);
              }
          });
        } else {
          var response = user;
          if (response.fb)
            response.fb = undefined;
          res.json(response);
        }*/
    });
}

/**
 * Get a single user
 */
exports.show = function(req, res, next) {
    var userId = req.params.id;

    User.findById(userId, function(err, user) {
        if (err) return next(err);
        if (!user) return res.send(401);
        res.json(user.profile);
    });
};

/**
 * Deletes a user
 * restriction: 'admin'
 */
exports.destroy = function(req, res) {
    User.findByIdAndRemove(req.params.id, function(err, user) {
        if (err) return res.send(500, err);
        return res.send(204);
    });
};

/**
 * Deletes yourself via the session id
 * restriction: 'loggedin'
 * When doing a delete self, i should remove myself from all tasks, that are
 * related to me.
 */
exports.deleteMyAccount = function(req, res) {
    if (!req.session.userId) {
        return res.send(500);
    }
    if (req.param('id') != req.session.userId) {
        return res.send(500);
    }

    User.findByIdAndRemove(req.session.userId, function(err, user) {
        if (err) return res.send(500, err);
        //destroy session then ok
        req.session.destroy();
        return res.send(204);
    });
};

/**
 * Change a users password
 */
exports.changePassword = function(req, res, next) {
    var userId = req.user._id;
    var oldPass = String(req.body.oldPassword);
    var newPass = String(req.body.newPassword);

    User.findById(userId, function(err, user) {
        if (user.authenticate(oldPass)) {
            user.password = newPass;
            user.forgotPassCode = uuid.v4();
            user.save(function(err) {
                if (err) return validationError(res, err);
                //notify.put(req,"Your password has been changed","success");
                res.send(200);
            });
        } else {
            res.send(403);
        }
    });
};

/**
 * Change a users password
 * This is done by the uuid
 * also note that the uuid code
 * requires a hash of it
 * code1 is the User.changePasswordCode
 * code2 is the sha1 hash of code1
 */
exports.resetChangePassword = function(req, res, next) {
    var newPass = String(req.body.newPassword);
    var code1 = String(req.body.resetCode1);
    var code2 = String(req.body.resetCode2);

    if (code2 != sha1(code1)) {
        return res.status(403).json({
            message: "Incorrect reset code",
            status: "error"
        });
    }
    User.findOne({
        "forgotPassCode": code1
    }, function(err, user) {
        if (err || user == null) {
            return res.status(404).json({
                status: "error",
                message: "There is no account with that email address."
            });
        } else {
            user.password = newPass;
            user.forgotPassCode = uuid.v4();
            user.save(function(err) {
                if (err) return validationError(res, err);
                //notify.put(req,"Your password has been changed","success");
                return res.send(200);
            });
        }
    });
};



/**
 * Send a verification email to the email address
 */
exports.sendVerificationEmail = function(req, res, next) {
    var userId = req.user._id;
    User.findById(userId, function(err, user) {
        if (err || user == null) {
            return res.status(500).json({
                status: "error",
                message: "We Couldn't find your account."
            });
            return;
        }
        if (user.verification.status == true) {
            return res.status(500).json({
                status: "warn",
                message: "Your email address is already verified"
            });
        }
        Emailer.resendVerification(req, res, user.email, user.verification.code);
    });
}

/**
 * Send a forgot password email to the email address
 * This way they can change their password
 */
exports.sendForgotPasswordEmail = function(req, res, next) {
    //notify.put(req,"You just tried forgot password","success");
    User.findOne({
        "email": req.param('email')
    }, function(err, user) {
        if (err || user == null) {
            return res.status(404).json({
                status: "error",
                message: "There is no account with that email address."
            });
        } else {
            if (user.forgotPassCode == undefined) {
                return res.status(404).json({
                    status: "error",
                    message: "Test email accounts do not have forgotPasswordCodes"
                });
            } else {
                return Emailer.sendForgotPasswordEmail(req, res, user.email, user.forgotPassCode, sha1(user.forgotPassCode));
            }
        }
    });
}

/**
 * Old way no longer used
 *
 **/
/*exports.resetPassword = function(req, res, next){
  if (typeof req.param('code') == 'undefined'){
    return res.json("Missing password reset code, please check your email again");
  }
  User.findOne({
    "forgotPassCode": req.param('code')
  },function(err, user){
    if(err || user==null) {
      return res.status(500).json({message:"Invalid password reset code. Try resubmitting forgot password"});
    }
    //here we will randomly set their password
    //this generates a random string 
    function randomPassword(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};
    user.password = randomPassword();
    user.forgotPassCode = uuid.v4();
    user.save(function(err) {
      if (err) return validationError(res, err);
      Emailer.sendNewPasswordEmail(req, res, user.email,user.password);
      return res.redirect('/');
    });
  });
}*/


exports.verifyEmailCompleted = function(req, res, next) {
    //TODO: find the verification code in the thing
    if (typeof req.param('code') == 'undefined') {
        res.json("Invalid verification code, please check again");
        return;
    }
    User.findOne({
        "verification.code": req.param('code')
    }, function(err, user) {
        if (err || user == null) {
            return res.status(500).json({
                message: "Invalid verification code"
            });
        }
        user.verification.status = true;
        user.save(function(err) {
            if (err) return validationError(res, err);
            res.redirect('/connect');
        });
    });
}

/**
 * Checks to see if my email is verified
 * This will use the session id for user id
 */
exports.isEmailVerified = function(req, res, next) {
    if (!req.session.userId) {
        return shutdown(req, res);
    }

    User.findById(req.session.userId, function(err, user) {
        if (err || user == null) {
            return res.status(500).json({
                status: "error",
                message: "We Couldn't find your account."
            });
        }
        if (user.verification.status == true) {
            next();
        } else {
            return res.status(500).json("Please verify your email first. You can resend a verification email in your settings page <a href='/settings'>here</a>");
        }
    });
}


/**
 * Get my info
 */
exports.me = function(req, res, next) {
    //console.log("Session: ",req.session);
    var userId = req.user._id;
    User.findOne({
        _id: userId
    }, '-salt -hashedPassword -verification.code -forgotPassCode', function(err, user) { // don't ever give out the password or salt
        if (err) return next(err);
        if (!user) return res.json(401);
        //test the accessToken if it expired then have them relog
        if (user.isConnectedWithFb && user.fb.accessToken) {
            graph.get("/me?access_token=" + user.fb.accessToken, function(err, data) {
                if (err) {
                    //this means that the token is no longer valid and will require the user to reconnect
                    //to make them reconnect we should send a message back
                    user.isConnectedWithFb = false;
                    user.save(function(err) {
                        if (err) return validationError(res, err);
                        return res.send(200);
                    });
                } else {
                    var response = user;
                    if (response.fb)
                        response.fb = undefined;
                    return res.json(response);
                }
            });
        } else {
            var response = user;
            if (response.fb)
                response.fb = undefined;
            res.json(response);
        }
    });
};

/**
 * Authentication callback
 */
exports.authCallback = function(req, res, next) {
    res.redirect('/');
};

function shutdown(req, res) {
    //notify.myself(req,"Please login again","warn"); 
    req.session.destroy();
    return res.redirect('/login');
}
