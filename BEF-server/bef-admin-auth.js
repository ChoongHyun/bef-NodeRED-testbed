/**
 * require 선언
 */
var when = require('when');
var request = require('request');

/**
 * variable
 */
// user role
var user = null;
var readWriteRole = { username: 'BEF', permissions: '*' };
var readOnlyRole = { anonymous: true, permissions: 'read' };
var portalTokenName = null;
var portalTokenValue = null;
var portalTokenJson = {};

var portalUrl = 'https://www.bef.exntu.net/app/designer/sso?url=';
var validationUrl = 'http://50.1.111.185:8080/api/v1/check/sso';

/**
 * module exports
 */
module.exports = {
    // cookie 없을 경우 portal로 redirect
    getApplicationId: function( path, nodeRedUrl, response ){
        response.redirect(302, portalUrl + nodeRedUrl );
    },
    getToken: function(){
        var result = {};
        if( portalTokenName && portalTokenValue ){
            result = {
                name: portalTokenName,
                token: portalTokenValue
            };
        }
        return result;
    },
    setToken: function( name, token ){
        portalTokenName = name;
        portalTokenValue = token;
        portalTokenJson = {
            name : name,
            token : token
        }
    },
    // cookie validation
    checkValidation: function( cookie, nodeRedUrl, appParam, path, response, next ) {
        // cookie 값 형태 -> 'eyJhbGciOiJSUzI1NiJ9.eyJzdWJfc3JjIjoiTkFUSVZFIiwicmVhZF93cyI6W10sInN1YiI6ImFkbWluMDEiLCJyb2xlcyI6WyJST0xFX0FETUlOIl0sImlzcyI6InNrdC5wbGF5Iiwib3duZWRfYXBwIjpbMjc4LDI3NSwyNzcsMjc2LDI2OCwyNjksMjY0LDI2NiwyNjUsMjYwLDI2MSwyMTcsMzM4LDIxNiwzMzcsMjE5LDIxOCwxNzksMjEyLDMzMywyMTUsMzM2LDIxNCwzMzUsMTc2LDE3NSwxNzgsMjExLDMzMiwxNzcsMjEwLDMzMSwxNzIsMTc0LDE3MywxNzAsMjA5LDIwNiwyMDgsMjA3LDE2OSwxNjgsMjAxLDI4OSwzMjUsMjAzLDE2NSwyODYsMjg1LDIwMCwyODgsMjgyLDI4NCwyODMsMjM1LDIzNCwyMzcsMjM2LDE5OCwyMzEsMTk3LDIzMCwyMzMsMTk5LDIzMiwxOTQsMTkzLDE5NiwxOTUsMTkwLDE5MiwxOTEsMjI4LDIyNywyMjksMjI0LDIyMywyMjUsMTg3LDIyMCwxODYsMTg5LDIyMiwxODgsMjIxLDE4MywxODIsMTg1LDE4NCwxODEsMTgwLDI1NywyNTYsMjU4LDI1MiwyNTUsMjUxLDI0NiwyNDUsMjQ3LDI0MiwyNDQsMjQzXSwid3JpdGVfd3MiOls3MF0sIm93bmVkX3dzIjpbMTA0LDEwNSwxMDYsMTA3LDEwOCwxMTIsMTEzLDExNCwxMTUsMTE2LDExNywxMTgsMTE5LDExMCwxMTEsMTA5LDcxLDcyLDczLDc0LDc5LDc1LDc2LDc3LDc4LDY5LDY1LDEyMywxMjQsMTI1LDEyNiwxMjcsOTIsMTIwLDEyMSwxMjIsODBdLCJ3cml0ZV9hcHAiOlsxNzFdLCJzdWJfdWlkIjo1LCJzdWJfdHlwZSI6IlVTRVIiLCJyZWFkX2FwcCI6W10sImV4cCI6MTUwODI5MDk0OSwiaWF0IjoxNTA4MjA0NTQ5LCJqdGkiOiI2OTkifQ.DcKyaNYrpBQGXFHYSbvEA0-JGKdE1SrrWiR2fniCzP7w0j2Wf2q22AqWOFFJNcEPe2XmA5A-YZuxRnxrhX-CTw';
        // 이유는 모르나 string으로 변환 후 다시 json parse
        cookie = JSON.stringify(cookie);
        cookie = JSON.parse(cookie);

        // portal 에 아래 값 형태로 body에 적용:
        /*
         {
             "name" : "bef-login-token",
             "token": "eyJhbGciOiJSUzI1NiJ9.eyJzdWJfc3JjIjoiTkFUSVZFIiwicmVhZF93cyI6W10sInN1YiI6ImFkbWluMDEiLCJyb2xlcyI6WyJST0xFX0FETUlOIl0sImlzcyI6InNrdC5wbGF5Iiwib3duZWRfYXBwIjpbMjc4LDI3NSwyNzcsMjc2LDI2OCwyNjksMjY0LDI2NiwyNjUsMjYwLDI2MSwyMTcsMzM4LDIxNiwzMzcsMjE5LDIxOCwxNzksMjEyLDMzMywyMTUsMzM2LDIxNCwzMzUsMTc2LDE3NSwxNzgsMjExLDMzMiwxNzcsMjEwLDMzMSwxNzIsMTc0LDE3MywxNzAsMjA5LDIwNiwyMDgsMjA3LDE2OSwxNjgsMjAxLDI4OSwzMjUsMjAzLDE2NSwyODYsMjg1LDIwMCwyODgsMjgyLDI4NCwyODMsMjM1LDIzNCwyMzcsMjM2LDE5OCwyMzEsMTk3LDIzMCwyMzMsMTk5LDIzMiwxOTQsMTkzLDE5NiwxOTUsMTkwLDE5MiwxOTEsMjI4LDIyNywyMjksMjI0LDIyMywyMjUsMTg3LDIyMCwxODYsMTg5LDIyMiwxODgsMjIxLDE4MywxODIsMTg1LDE4NCwxODEsMTgwLDI1NywyNTYsMjU4LDI1MiwyNTUsMjUxLDI0NiwyNDUsMjQ3LDI0MiwyNDQsMjQzXSwid3JpdGVfd3MiOls3MF0sIm93bmVkX3dzIjpbMTA0LDEwNSwxMDYsMTA3LDEwOCwxMTIsMTEzLDExNCwxMTUsMTE2LDExNywxMTgsMTE5LDExMCwxMTEsMTA5LDcxLDcyLDczLDc0LDc5LDc1LDc2LDc3LDc4LDY5LDY1LDEyMywxMjQsMTI1LDEyNiwxMjcsOTIsMTIwLDEyMSwxMjIsODBdLCJ3cml0ZV9hcHAiOlsxNzFdLCJzdWJfdWlkIjo1LCJzdWJfdHlwZSI6IlVTRVIiLCJyZWFkX2FwcCI6W10sImV4cCI6MTUwNzg1ODQ5NCwiaWF0IjoxNTA3NzcyMDk0LCJqdGkiOiI2ODIifQ.JnjnYyXmPkLaCxlf9iHuHnHIJeK6G1o5zTsNJl6lQ4MLDQkY9wXFh-fr8bnH_rAIz6rh_s83ZiN_HtekVvlsuA"
         }
         */
        if (cookie['bef-login-token']) {
            cookie = {
                name: 'bef-login-token',
                token: cookie['bef-login-token']
            }
        }
        var options = {
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            json: {
                'name': cookie.name,
                'token': cookie.token
            }
        }
        // POST 로 cookie 값 체크 (portal 에서 return 은 boolean 값)
        request.post(validationUrl + '/' + appParam + '?url=' + nodeRedUrl, options, function (error, res, body) {
            // server check
            if (error != null) {
                portalTokenJson = {};
                portalTokenName = null;
                portalTokenValue = null;
                user = null;
                return errorPage(res);
            }
            // response body return은 boolean 값
            if (body == true) {
                user = decodeToken(cookie.token, appParam);
                next();
            } else {
                // cookie 값이 변조되었을 경우 noauth
                // this.removeUserRole();
                // this.clearToken();
                portalTokenJson = {};
                portalTokenName = null;
                portalTokenValue = null;
                user = null;
                res.clearCookie('bef-login-token');
                return noauthPage(res);
            }
        });
    },
    removeUserRole: function(){
        user = null;
        return when.promise(function(resolve) {
            resolve(null);
        });
    },
    clearToken: function(){
        portalTokenJson = {};
        portalTokenName = null;
        portalTokenValue = null;
    },

    // nodeRED 제공
    default: function() {
        return when.promise(function(resolve) {
            resolve(user);
        });
    }
}
// base64로 decode 함
function decodeToken( token, appParam ){
	var decode = new Buffer(token, 'base64');
	var decodeValue = decode.toString('utf8');
	return findRole(decodeValue, appParam);
}
//
function findRole( decodeValue, appParam ) {
    decodeValue = decodeValue.split('}')
    for (var i = 0; i < decodeValue.length; i++) {
        var tempDecodeValue = JSON.parse(decodeValue[i] + '}');
        if (null != tempDecodeValue.sub) {
            decodeValue = tempDecodeValue;
            // role check
            if (checkRole(decodeValue.owned_app, appParam)) {
                return readWriteRole;
            } else if (checkRole(decodeValue.write_app, appParam)) {
                return readWriteRole;
            } else if (checkRole(decodeValue.read_app, appParam)) {
                return readOnlyRole;
            } else {
                return null;
            }
        }
    }
}
function checkRole( arrayList, num ){
    var isTrue = false;
    for( var i=0; i<arrayList.length; i++ ){
        if( arrayList[i] == num ){
            isTrue = true;
        }
    }
    return isTrue;
}

/**
 * error handling
 */
function noauthPage( response ){
    response.redirect(302, '/noauth');
}
function errorPage( response ){
    response.redirect(302, '/error');
}
