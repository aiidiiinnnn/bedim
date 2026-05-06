let token = localStorage.getItem("token")

if(!token){

username = prompt("username")
password = prompt("password")

fetch("http://127.0.0.1:8000/login?username="+username+"&password="+password,{
method:"POST"
})
.then(r=>r.json())
.then(d=>{
localStorage.setItem("token",d.token)
location.reload()
})

}

const ws = new WebSocket("ws://127.0.0.1:8000/ws/chat?token="+token)

const messages = document.getElementById("messages")

ws.onmessage = e=>{

data = JSON.parse(e.data)

if(data.type==="message"){

div=document.createElement("div")
div.className="msg"

div.innerHTML="<b>"+data.user+"</b><br>"+(data.content||"")

if(data.media){

if(data.media.endsWith(".mp4")){

video=document.createElement("video")
video.src="http://127.0.0.1:8000"+data.media
video.controls=true

div.appendChild(video)

}else{

img=document.createElement("img")
img.src="http://127.0.0.1:8000"+data.media

div.appendChild(img)

}

}

messages.appendChild(div)

messages.scrollTop=messages.scrollHeight

notify(data)

}

}

function send(){

input=document.getElementById("msgInput")
file=document.getElementById("file").files[0]

if(file){

form=new FormData()
form.append("file",file)

fetch("http://127.0.0.1:8000/upload",{method:"POST",body:form})
.then(r=>r.json())
.then(d=>{
ws.send(JSON.stringify({
media:d.url
}))

})

}else{

ws.send(JSON.stringify({
content:input.value
}))

}

input.value=""

}

function notify(data){

if(Notification.permission==="granted"){

new Notification("New message from "+data.user,{
body:data.content||"media"
})

}

}

Notification.requestPermission()

if("serviceWorker" in navigator){

navigator.serviceWorker.register("sw.js")

}
