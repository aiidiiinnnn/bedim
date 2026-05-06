self.addEventListener("push",function(e){

data=e.data.json()

self.registration.showNotification(data.title,{
body:data.body,
icon:"icon.png"
})

})
