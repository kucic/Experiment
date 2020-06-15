(function () {

    var promiseChain = Promise.resolve();
    var callbacks = {};
    var init = function () {
        // 유니크한 아이디를 생성한다.
        // native에서 callback 받을때 id의 callback을 호출한다.
        const guid = function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        }

        /**
         * javascript => react-native
         * javascript에서 react-native에 메세지를 보낸다.
         */
        window.webViewBridge = {
            send: function (targetFunc, data, success, error) {

                alert('send')
                var msgObj = {
                    targetFunc: targetFunc,
                    data: data || {}
                };

                if (success || error) {
                    msgObj.msgId = guid();
                }

                var msg = JSON.stringify(msgObj);

                promiseChain = promiseChain.then(function () {
                    return new Promise(function (resolve, reject) {
                        console.warn("react native에 메세지를 보냄 " + msgObj.targetFunc);

                        if (msgObj.msgId) {
                            callbacks[msgObj.msgId] = {
                                onsuccess: success,
                                onerror: error
                            };
                        }
                        window.ReactNativeWebView.postMessage(msg);
                        resolve();
                    })
                }).catch(function (e) {
                    console.error('메세지 실패 ' + e.message);
                });
            },
        };

        /**
         * react-native => javascript
         * react native에서 화면에 결과를 넘겨준다.
         */ 
            document.addEventListener('message', function (e) {
           // window.document.addEventListener('message', function (e) {
                console.log("react native에서 메세지를 받음", JSON.parse(e.data));
                $('#result').html('ok get')
                var message;
                try {
                    message = JSON.parse(e.data)
                }
                catch (err) {
                    console.error("메세지를 파싱할수 없음 " + err);
                    return;
                }
    
                // callback을 트리거한다.
                if (callbacks[message.msgId]) {
                    if (message.isSuccessfull) {
                        callbacks[message.msgId].onsuccess.call(null, message);
                    } else {
                        callbacks[message.msgId].onerror.call(null, message);
                    }
                    delete callbacks[message.msgId];
                }
             
        })
        
    }
    init();
}());