'use strict';

/**
 * Builds the cordova project for the iOS platform.
 *
 * @author Sam Verschueren      <sam.verschueren@gmail.com>
 * @since  30 April 2015
 */

// module dependencies
var path = require('path'),
    fs = require('fs'),
    through = require('through2'),
    gutil = require('gulp-util'),
    Q = require('q'),
    cordovaLib = require('cordova-lib').cordova,
    cordova = cordovaLib.raw,
    exec = require('child_process').exec;

// export the module
module.exports = function(options) {

    return through.obj(function(file, enc, cb) {
        // Change the working directory
        process.env.PWD = file.path;

        // Pipe the file to the next step
        this.push(file);

        cb();
    }, function(cb) {
        var exists = fs.existsSync(path.join(cordovaLib.findProjectRoot(), 'platforms', 'ios')),
            reAdd = exists === true && options.reAddPlatform === true,
            release = options.release === true,
            device = options.device === true,
            codeSignIdentity = options.codeSignIdentity || null,
            provisioningProfile = options.provisioningProfile || null,
            spec = options.version ? ("ios@" + options.version) : "ios";

        Q.fcall(function() {
            if(reAdd) {
                // First remove the platform if we have to re-add it
                return cordova.platforms('rm', 'ios');
            }
        }).then(function() {
            if(exists === false || reAdd) {
                // Add the iOS platform if it does not exist or we have to re-add it
                return cordova.platforms('add', spec);
            }
        }).then(function() {
            // Build the platform
            var params = [];

            if (release)
            {
                params.push('--release');
            }

            if (device)
            {
                params.push('--device');
            }

            if (codeSignIdentity !== null && provisioningProfile !== null)
            {
                fs.writeFileSync('build.json', JSON.stringify({
                    ios: {
                        debug: {
                            codeSignIdentity: codeSignIdentity,
                            provisioningProfile: provisioningProfile
                        },
                        release: {
                            codeSignIdentity: codeSignIdentity,
                            provisioningProfile: provisioningProfile
                        }
                    }
                }));

                params.push('--buildConfig=build.json');
            }

            return cordova.build({platforms: ['ios'], options: params});
        })
        .then(cb).catch(function(err) {
            // Return an error if something happened
            cb(new gutil.PluginError('gulp-cordova-build-ios', err.message));
        });
    });
};
