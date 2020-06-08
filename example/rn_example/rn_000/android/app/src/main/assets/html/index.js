(function () {

    // react-native에 통신을 요청한다.
    $('#btnSend').on('click', function() {
        alert('gogo btn')
        var option = {
            url: '/movie.json'
        }

        // "getMovieList"는 react-native에서 받는 메서드 이름입니다.
        window.webViewBridge.send('getMovieList', option, function(res) {
            $('#result').html(JSON.stringify(res))
        }, function(err) {
            console.error(err)
        })
    })

}());