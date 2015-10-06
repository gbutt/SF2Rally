window.addEventListener('message', function(e) {try {
	var data = JSON.parse(e.data); 
	if (!!data.selector && !!data.height) {
		document.querySelector(data.selector).height = data.height;
	}
}catch(ex){}});