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

Change Log
=========

* 05-03-2013 Initial commit, split from https://github.com/dschaffe/brackets-xunit project
