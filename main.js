/*
 * Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 * brackets-test262 - a brackets extension to run the ecma test262 javascript test suite
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global brackets, define, $, window, Mustache, document */

define(function (require, exports, module) {
    'use strict';

    var AppInit             = brackets.getModule("utils/AppInit"),
        CommandManager      = brackets.getModule("command/CommandManager"),
        Dialogs             = brackets.getModule("widgets/Dialogs"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        FileUtils           = brackets.getModule("file/FileUtils"),
        Menus               = brackets.getModule("command/Menus"),
        NativeFileSystem    = brackets.getModule("file/NativeFileSystem").NativeFileSystem,
        NodeConnection      = brackets.getModule("utils/NodeConnection"),
        DocumentManager     = brackets.getModule("document/DocumentManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        FileViewController  = brackets.getModule("project/FileViewController");
    var moduledir           = FileUtils.getNativeModuleDirectoryPath(module),
        configEntry         = new NativeFileSystem.FileEntry(moduledir + '/config.js'),
        config              = {},
        COMMAND_ID          = "BracketsTest262.BracketsTest262",
        commands            = [],
        TEST262TEST_CMD     = "test262_cmd",
        projectMenu         = Menus.getContextMenu(Menus.ContextMenuIds.PROJECT_MENU),
        workingsetMenu      = Menus.getContextMenu(Menus.ContextMenuIds.WORKING_SET_MENU),
        nodeConnection      = new NodeConnection(),
        test262config       = [],
        _windows            = {};

    // display a modal dialog when an error occurs
    function showError(title, message) {
        Dialogs.showModalDialog(
            Dialogs.DIALOG_ID_ERROR,
            title,
            message
        );
    }
    function chain() {
        var functions = Array.prototype.slice.call(arguments, 0);
        if (functions.length > 0) {
            var firstFunction = functions.shift();
            var firstPromise = firstFunction.call();
            firstPromise.done(function () {
                chain.apply(null, functions);
            });
        }
    }
    function runTest262() {
        var entry = ProjectManager.getSelectedItem();
        if (entry === undefined) {
            entry = DocumentManager.getCurrentDocument().file;
        }
        var path = entry.fullPath,
            base = path.substring(0, path.lastIndexOf('/test/')),
            test262 = base + "/tools/packaging/test262.py",
            test = '';
        if (path.indexOf("/suite/") > -1) {
            test = path.substring(path.indexOf("/suite/") + 7);
        }
        var teststr = test,
            i,
            shell,
            params,
            env,
            cacheTime,
            python;
        if (test === '') {
            teststr = 'all';
        }
        var template = require("text!templates/test262.html");
        var html = Mustache.render(template, { tests: teststr,
                                               title: "test262 - test/suite/" + test});
        var newWindow = window.open("about:blank", null, "width=600,height=200");
        newWindow.document.write(html);
        var spawned = function (data) {
            var pid = data[0],
                shell = data[2].name + " : " + data[2].path,
                errorMsg = data[3];
            _windows[pid] = {window: newWindow, startTime: new Date(), type: "test262", passes: 0, fails: 0, expfails: 0, current: '', done: false };
            var doc = newWindow.document;
            var entrypoint = doc.getElementById("entrypoint");
            var shellLabel = doc.createElement("span");
            shellLabel.className = "command";
            shellLabel.innerHTML = "Shell";
            shellLabel.style.marginTop = "10px";
            entrypoint.appendChild(shellLabel);
            
            var shellText = doc.createElement("span");
            shellText.className = "details";
            shellText.innerHTML = shell;
            entrypoint.appendChild(shellText);
            entrypoint.appendChild(doc.createElement("br"));

            var statusLabel = doc.createElement("span");
            statusLabel.className = "command";
            statusLabel.innerHTML = "Status";
            entrypoint.appendChild(statusLabel);
            
            var statusText = doc.createElement("span");
            statusText.className = "details";
            statusText.id = "status" + pid;
            statusText.innerHTML = "0 passes, 0 failures";
            entrypoint.appendChild(statusText);
            entrypoint.appendChild(doc.createElement("br"));
            
            var timeLabel = doc.createElement("span");
            timeLabel.className = "command";
            timeLabel.innerHTML = "Time";
            entrypoint.appendChild(timeLabel);
            
            var timeText = doc.createElement("span");
            timeText.className = "details";
            timeText.id = "time" + pid;
            timeText.innerHTML = "0s";
            entrypoint.appendChild(timeText);
            entrypoint.appendChild(doc.createElement("br"));

            var exitcodeLabel = doc.createElement("span");
            exitcodeLabel.className = "command";
            exitcodeLabel.innerHTML = "Exit code";
            entrypoint.appendChild(exitcodeLabel);
            
            var exitcodeText = doc.createElement("span");
            exitcodeText.className = "details";
            exitcodeText.id = "exitcode" + pid;
            exitcodeText.innerHTML = "running with pid " + pid;
            entrypoint.appendChild(exitcodeText);
            entrypoint.appendChild(doc.createElement("br"));
             
            var stdoutsection = doc.createElement("span");
            stdoutsection.id = "stdoutsection" + pid;
            stdoutsection.className = "section";
            stdoutsection.style.display = "block";
            var stdoutlabel = doc.createElement("span");
            stdoutlabel.className = "command";
            stdoutlabel.appendChild(doc.createTextNode("output"));
            var stdout = doc.createElement("div");
            stdout.className = "content";
            stdout.id = "stdout" + pid;
            var out = "$ ";
            for (i = 0; i < data[1].length; i++) {
                out += data[1][i] + " ";
            }
            out += '<br>';
            stdout.innerHTML = out;
            stdoutsection.appendChild(stdoutlabel);
            stdoutsection.appendChild(stdout);
            entrypoint.appendChild(stdoutsection);
            
            var stderrsection = doc.createElement("span");
            stderrsection.id = "stderrsection" + pid;
            stderrsection.className = "section";
            var stderrlabel = doc.createElement("span");
            stderrlabel.className = "command";
            stderrlabel.appendChild(doc.createTextNode("error"));
            var stderr = doc.createElement("div");
            stderr.className = "content";
            stderr.id = "stderr" + pid;
            stderrsection.appendChild(stderrlabel);
            stderrsection.appendChild(stderr);
            if (errorMsg !== '') {
                stderrsection.display = "block";
                stderrsection.innerHTML += errorMsg;
                exitcodeText.innerHTML = "finished with exit code -1";
            }
            entrypoint.appendChild(stderrsection);
        };
        for (i = 0; i < test262config.length; i++) {
            params = [test262, "--full-summary", "--command", test262config[i].path, test];
            env = {};
            if (test262config[i].env !== undefined) {
                env = test262config[i].env;
            }
            cacheTime = 3000;
            if (test262config[i].cacheTime !== undefined) {
                cacheTime = test262config[i].cacheTime;
            }
            python = "python";
            if (test262config[i].python !== undefined) {
                python = test262config[i].python;
            }
            nodeConnection.domains.processTest262.spawnSession({executable: python, args: params, directory: base, env: env, shells: test262config[i], cacheTime: cacheTime}).done(spawned);
        }
        newWindow.focus();
    }
    function runTest262Setup() {
        FileUtils.readAsText(configEntry)
            .done(function (text, readTimestamp) {
                try {
                    config = JSON.parse(text);
                    if (config.hasOwnProperty("commands") && config.commands[0].name !== '<description>') {
                        test262config = config.commands;
                        runTest262();
                    } else {
                        test262config = {};
                        console.log("[brackets-test262]: " + moduledir + "/config.js commands property is not set");
                        showError("Test262 configuration", "Error: in file " + moduledir + "/config.js the 'commands' property is not set.");
                    }
                } catch (e) {
                    console.log("[brackets-test262]: " + moduledir + "/config.js could not parse config info");
                    showError("Test262 configuration", "Error: file " + moduledir + "/config.js could not be parsed as JSON.");
                }
            })
            .fail(function (error) {
                console.log("[brackets-test262]: could not load file " + moduledir + "/config.js");
                showError("Test262 Config", "Error: could not load file " + moduledir + "/config.js");
            });
    }

    // determine if file is test262
    // look at file path for a test directory
    // from the test directory go back one level and look
    // for existance of tools/packaging/test262.py
    // parameter: string of the test file name
    // returns: a deferred object, result will be the base directory from where 
    //          tools/packaging/test262.py can be added to find the python test runner
    function determineTest262FileType(path) {
        if (path.indexOf('/test/') === -1) {
            return undefined;
        }
        if (path.substring(path.length - 5) === '/test') {
            path += "/";
        }
        var base = path.substring(0, path.lastIndexOf('/test/'));
        var deferred = $.Deferred();
        NativeFileSystem.resolveNativeFileSystemPath(base + '/tools/packaging/test262.py', function (entry) {
            deferred.resolve(base);
        }, function (err) {
            deferred.resolve();
        });
        return deferred.promise();
    }

    // converts time in ms to a more readable string format
    // e.g. 1h 10m 30.2s
    function formatTime(ms) {
        var result = "",
            secs = ms / 1000;
        if (secs >= 60 * 60 * 24 * 365) {
            result = (Math.floor(secs / (60 * 60 * 24 * 365))) + "y ";
            secs = secs % (60 * 60 * 24 * 365);
        }
        if (secs >= 60 * 60 * 24) {
            result = (Math.floor(secs / (60 * 60 * 24))) + "d ";
            secs = secs % (60 * 60 * 24);
        }
        if (secs >= 60 * 60) {
            result = result + (Math.floor(secs / (60 * 60))) + "h ";
            secs = secs % (60 * 60);
        }
        if (secs >= 60) {
            result = result + (Math.floor(secs / 60)) + "m ";
            secs = secs % 60;
        }
        if (result === "" || secs > 0) {
            result = result + Math.round(10 * secs) / 10 + "s";
        }
        if (result[result.length - 1] === " ") {
            result = result.substring(0, result.length - 1);
        }
        return result;
    }

    AppInit.appReady(function () {
        nodeConnection = new NodeConnection();
        function connect() {
            var connectionPromise = nodeConnection.connect(true);
            connectionPromise.fail(function () {
                console.error("[brackets-test262] failed to connect to node");
            });
            return connectionPromise;
        }

        function loadProcessTest262Domain() {
            var path = ExtensionUtils.getModulePath(module, "node/ProcessTest262Domain");
            var loadPromise = nodeConnection.loadDomains([path], true);
            loadPromise.fail(function () {
                console.log("[brackets-test262] failed to load process domain");
            });
            return loadPromise;
        }

        function processOutput(pid, data) {
            var status = '';
            if (_windows[pid].done === false) {
                if (data.indexOf("=== Summary ===") > -1) {
                    _windows[pid].done = true;
                }
                var passes = data.match(/passed/g);
                if (passes === null) {
                    passes = 0;
                } else {
                    passes = passes.length;
                }
                _windows[pid].passes += passes;
                if (passes > 0) {
                    status += '<span style="color:green">' + _windows[pid].passes + ' passes</span>, ';
                } else {
                    status += _windows[pid].passes + " passes, ";
                }
                var failures = data.match(/failed in (non-)?strict mode ===<br>/g);
                if (failures === null) {
                    failures = 0;
                } else {
                    failures = failures.length;
                }
                _windows[pid].fails += failures;
                if (_windows[pid].fails === 0) {
                    status += "0 failures";
                } else {
                    status += ' <span style="color:red">' + _windows[pid].fails + ' failures</span>';
                }
                var expectedfailures = data.match(/failed in (non-)?strict mode as expected<br>/g);
                if (expectedfailures === null) {
                    expectedfailures = 0;
                } else {
                    expectedfailures = expectedfailures.length;
                }
                _windows[pid].expfails += expectedfailures;
                if (_windows[pid].expfails > 0) {
                    status += ", " + _windows[pid].expfails + " expected failures";
                }
                _windows[pid].window.document.getElementById("status" + pid).innerHTML = status;
            }
        }
            
        $(nodeConnection).on("processTest262.stdout", function (event, result) {
            var pid = result.pid,
                data = result.data;
            data = data.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
            if (_windows.hasOwnProperty(pid) === false) {
                showError("Process Error", "there is no window with pid=" + pid);
            } else {
                var _window = _windows[pid].window,
                    _time = _windows[pid].startTime,
                    _type = _windows[pid].type,
                    elapsed = new Date() - _time;
                data = _windows[pid].current + data;
                var status = '';
                _windows[pid].current = data.substring(data.lastIndexOf("<br>") + 4);
                if (_windows[pid.current] !== '') {
                    data = data.substring(0, data.lastIndexOf('<br>') + 4);
                }
                _window.document.getElementById("stdout" + pid).innerHTML += data;
                _window.document.getElementById("stdout" + pid).scrollTop = _window.document.getElementById("stdout" + pid).scrollHeight;
                _window.document.getElementById("time" + pid).innerHTML = formatTime(elapsed);
                processOutput(pid, data);
            }
        });
                
        $(nodeConnection).on("processTest262.stderr", function (event, result) {
            var pid = result.pid,
                data = result.data;
            data = data.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>');
            if (_windows.hasOwnProperty(pid) === false) {
                showError("Process Error", "there is no window with pid=" + pid);
            } else {
                var _window = _windows[pid].window,
                    _time = _windows[pid].startTime,
                    _type = _windows[pid].type,
                    elapsed = new Date() - _time;
                _window.document.getElementById("stderrsection" + pid).style.display = "block";
                _window.document.getElementById("stderr" + pid).innerHTML += data;
                _window.document.getElementById("time" + pid).innerHTML = formatTime(elapsed);
                _windows[pid].error += data;
            }
        });

        $(nodeConnection).on("processTest262.exit", function (event, result) {
            var pid = result.pid,
                data = result.data;
            data = data.replace(/\n/g, '<br>');
            if (_windows.hasOwnProperty(pid) === false) {
                showError("Process Error", "there is no window with pid=" + pid);
            } else {
                var _window = _windows[pid].window,
                    _time = _windows[pid].startTime,
                    elapsed = new Date() - _time,
                    code = result.exitcode;
                var status = '';
                _window.document.getElementById("stdout" + pid).innerHTML += data;
                _window.document.getElementById("stdout" + pid).scrollTop = _window.document.getElementById("stdout" + pid).scrollHeight;
                _window.document.getElementById("exitcode" + pid).innerHTML = "finished with exit code " + code;
                _window.document.getElementById("time" + pid).innerHTML = formatTime(elapsed);
                processOutput(pid, data);
            }
        });
        chain(connect, loadProcessTest262Domain);
    });
    
    // determine if a file is a known test type
    // first look for brackets-test262: [type], takes precedence
    // next look for distinguishing clues in the file:
    //   YUI: 'YUI(' and 'Test.runner.test'
    //   jasmine: 'describe' and 'it'
    //   QUnit: 'test()' and 'it()'
    //   test262: look at path for test directory then check for 
    //           ../tools/packaging/test262.py
    function determineFileType(fileEntry, text) {
        if (text && fileEntry && fileEntry.fullPath && fileEntry.fullPath.match(/\.js$/)) {
            if (text.match(/brackets-test262:\s*test262/i) !== null) {
                return "test262";
            }
        } else {
            return "unknown";
        }
    }
    // on click check if file matches a test type and add context menuitem
    function checkFileTypes(menu, entry, text) {
        var i;
        for (i = 0; i < commands.length; i++) {
            menu.removeMenuItem(commands[i]);
        }
        if (entry === null) {
            return "unknown";
        }
        var promise = determineTest262FileType(entry.fullPath);
        if (promise !== undefined) {
            promise.done(function (path) {
                if (path !== undefined) {
                    menu.addMenuItem(TEST262TEST_CMD, "", Menus.LAST);
                }
            });
        }
    }

    // Register commands as right click menu items
    commands = [TEST262TEST_CMD];
    CommandManager.register("Run test262 Test", TEST262TEST_CMD, runTest262Setup);

    // Determine type of test for selected item in project
    $(projectMenu).on("beforeContextMenuOpen", function (evt) {
        var selectedEntry = ProjectManager.getSelectedItem(),
            text = '';
        if (selectedEntry && selectedEntry.fullPath && DocumentManager.getCurrentDocument() !== null && selectedEntry.fullPath === DocumentManager.getCurrentDocument().file.fullPath) {
            text = DocumentManager.getCurrentDocument().getText();
        }
        checkFileTypes(projectMenu, selectedEntry, text);
    });
    // Determine type of test for selected item in project
    $(workingsetMenu).on("beforeContextMenuOpen", function (evt) {
        var selectedEntry = DocumentManager.getCurrentDocument().file,
            text = DocumentManager.getCurrentDocument().getText();
        checkFileTypes(workingsetMenu, selectedEntry, text);
    });
});