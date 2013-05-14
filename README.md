brackets-test262
===========

A brackets extension to run test262 tests and aid in the development of the test262 test suite.   See http://test262.ecmascript.org/ 
for more information on test262.   The TC39 working group of Ecma International is responsible for the ECMA-262 standard commonly known
as "JavaScript". 

Installation
===========

1. Run Brackets, Select File/Install Extension...
2. Enter https://github.com/dschaffe/brackets-test262
3. If case brackets is unable to install the extension download brackets-test262.zip from the above github site, unzip the file into
   the Brackets extension directory (OSX: /Users/<username>/Library/Application Support/Brackets/extensions/user or
   Windows: C:/Users/<username>/AppData/Roaming/Brackets/extensions/user) then restart Brackets
4. Download the test262 source code using mercurial: hg clone http://hg.ecmascript.org/tests/test262/
5. the config.js file must be editing to point to one or more javascript shells to run tests against 
6. Open your version of test262 in brackets, right clicking on a test file or directory will show the Run Test menu item

Let me know if you have any suggestions or issues.  Contact me at: dschaffe@adobe.com.

Implementation Notes
====================
- The config.js file may contain "script_options" : "settings".  The "settings" are arguments passed to the test262.py
script.  For example setting: "script_options" : "--full-summary --loglevel=info" will pass in parameters to test262.py
each invocation.
- In config.js muliple shells or shells with different runtime parameters may be specified and each test will run and
compare the results
- Selecting a test262 file or directory and right clicking to display the context menu will show the menu to run a test
- Right clicking a test or directory and selecting View Specification will open your browser to the ecma 262 or ecma 402
spec to the section relevant to the test 

Future Enhancements
===================
- Allow an option to run test suite in the chrome browser (CEF)
- Editing a test or creating a new test will update/generate a matching .json file for the browser version of the testsuite

Known Issues
============
- Brackets will complain if test262 files are in the current project.  The warning is "Error Indexing Files, The maximum
number of files have been indexed. Actions that look up files in the index may function incorrectly."

Change Log
=========

* 05-03-2013 Initial commit, split from https://github.com/dschaffe/brackets-xunit project
