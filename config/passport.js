
var LocalStrategy   = require('passport-local').Strategy;
var JWTStrategy     = require('passport-jwt').Strategy,
    ExtractJwt      = require('passport-jwt').ExtractJwt;



var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = 'learnlovecode';


// load up the user model
var User = require('../models/user');

// expose this function to our app using module.exports
module.exports = function(passport) {

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

// used to deserialize the user
  passport.deserializeUser(function(id, done) {
      User.findById(id, function(err, user) {
          done(err, user);
      });
  });



  passport.use(new JWTStrategy(opts, function(jwt_payload, done) {
    User.findOne({id: jwt_payload.sub}, function(err, user) {
      if (err) {
        return done(err, false);
      }
      if (user) {
        return done(null, user)
      } else {
        return done(null, false)
      }
    })
  }))




  passport.use('local-login', new LocalStrategy({
      // by default, local strategy uses email and password, we will override with email
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, email, password, done) {
      console.log(email, password)
      if (email) {
        email = email.toLowerCase();
      }// Use lower-case e-mails to avoid case-sensitive e-mail matching

      // asynchronous
      process.nextTick(function() {
          User.findOne({ 'local.email' :  email }, function(err, user) {
              if (err) {
                return done(err);
              }


              // if no user is found, return the message
              if (!user) {
                return done(null, false);
              }
              if (!user.validPassword(password)) {

                return done(null, false);
              }


              // all is well, return user
              else {
                return done(null, user);
              }

          });
      });

  }));

  // =========================================================================
  // LOCAL SIGNUP ============================================================
  // =========================================================================
  passport.use('local-signup', new LocalStrategy({
      // by default, local strategy uses email and password, we will override with email
      usernameField : 'email',
      passwordField : 'password',
      passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
  },
  function(req, email, password, done) {
      if (email)
          email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

      // asynchronous
      process.nextTick(function() {
          // if the user is not already logged in:
          if (!req.user) {
              User.findOne({ 'local.email' :  email }, function(err, user) {
                  // if there are any errors, return the error
                  if (err)
                      return done(err);

                  // check to see if theres already a user with that email
                  if (user) {
                      return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
                  } else {

                      // create the user
                      var newUser            = new User();

                      newUser.local.email    = email;
                      newUser.local.password = newUser.generateHash(password);

                      newUser.save(function(err) {
                          if (err)
                              return done(err);

                          return done(null, newUser);
                      });
                  }

              });
          // if the user is logged in but has no local account...
          } else if ( !req.user.local.email ) {
              // ...presumably they're trying to connect a local account
              // BUT let's check if the email used to connect a local account is being used by another user
              User.findOne({ 'local.email' :  email }, function(err, user) {
                  if (err)
                      return done(err);

                  if (user) {
                      return done(null, false, req.flash('loginMessage', 'That email is already taken.'));
                      // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                  } else {
                      var user = req.user;
                      user.local.email = email;
                      user.local.password = user.generateHash(password);
                      user.save(function (err) {
                          if (err)
                              return done(err);

                          return done(null,user);
                      });
                  }
              });
          } else {
              // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
              return done(null, req.user);
          }

      });

  }));






};
