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
            provisioningProfile = options.provisioningProfile || null;

        var ipa = (release && device && codeSignIdentity != null && provisioningProfile != null) ? options.ipa : null;

        var startTime = new Date();

        Q.fcall(function() {
            if(reAdd) {
                // First remove the platform if we have to re-add it
                return cordova.platforms('rm', 'ios');
            }
        }).then(function() {
            if(exists === false || reAdd) {
                // Add the iOS platform if it does not exist or we have to re-add it
                return cordova.platforms('add', 'ios');
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

            if (codeSignIdentity)
            {
                params.push('--codeSignIdentity="' + codeSignIdentity + '"');
            }

            if (provisioningProfile)
            {
                params.push('--provisioningProfile="' + provisioningProfile + '"');
            }

            return cordova.build({platforms: ['ios'], options: params});
        }).then(function() {
            if (ipa !== null)
            {
                var appDirectory = null;

                var appDirectoriesParent = path.join(process.cwd(), 'platforms', 'ios', 'build', 'device');
                var potentialAppDirectories = fs.readdirSync(appDirectoriesParent);

                for (var i = 0; i < potentialAppDirectories.length; i++)
                {
                    var potentialAppDirectory = path.join(appDirectoriesParent, potentialAppDirectories[i]);
                    var stats = fs.statSync(potentialAppDirectory);

                    if (stats.isDirectory() && stats.mtime.getTime() > startTime)
                    {
                        appDirectory = potentialAppDirectory;
                        break;
                    }
                }

                if (appDirectory)
                {
                    var deferred = Q.defer();

                    exec('/usr/bin/xcrun -sdk iphoneos PackageApplication "' + appDirectory + '" -o "' + ipa + '"', {}, function (error, stdout, stderr) {
                        if (error === null)
                        {
                            deferred.resolve();
                        }
                        else
                        {
                            deferred.reject(error);
                        }
                    });

                    return deferred.promise;
                }
            }
        })
        .then(cb).catch(function(err) {
            // Return an error if something happened
            cb(new gutil.PluginError('gulp-cordova-build-ios', err.message));
        });
    });
};
