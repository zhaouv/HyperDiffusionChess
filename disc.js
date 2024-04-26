async function fetchData(datafile) {
    const response = await fetch(datafile);
    return await response.json(); 
}

// const MODEL='HEPTAGONAL'
const MODEL='Square'

fetchData('Heptagonal.json')
.then(robj => {
    if(MODEL!='HEPTAGONAL')return
    console.log(robj);
    // robj=Heptagonal

    robj['size']=Array.from(robj)

    if(1)Array.from(robj).forEach((v,ii) => {
        var [x1,y1]=robj['center'][ii]
        robj['size'][ii]=(1-x1**2-y1**2) * 0.25
        disc({ x: x1, y: y1 }, robj['size'][ii], ii)
    });
    
    document.querySelector('.p1').classList.add('ban')
    document.querySelector('.p1').classList.remove('blank')

    document.querySelector('.p5').classList.add('chess')
    document.querySelector('.p5').classList.remove('blank')
    
    document.querySelector('.p3').classList.add('critical')

    if(0)Array.from(robj).forEach((v,ii) => {
        var [x1,y1]=robj['center'][ii]
        for (const jj of robj['link'][ii]) {
            var [x2,y2]=robj['center'][jj]
            link({ x: x1, y: y1 }, { x: x2, y: y2 });
        }
    });

});

// 获取 SVG 元素
var svg = document.querySelector('.discsvg');

// // 创建单位圆
// var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
// circle.setAttribute("cx", "0");
// circle.setAttribute("cy", "0");
// circle.setAttribute("r", "1");
// circle.setAttribute("fill", "none");
// circle.setAttribute("stroke", "black");
// circle.setAttribute("stroke-width", "0.01");
// svg.appendChild(circle);

function disc(p1, size, pid) {
    var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");

    path.setAttribute("cx", p1.x);
    path.setAttribute("cy", p1.y);
    path.setAttribute("r", size);
    // path.setAttribute("fill", "#d0000033");
    // path.setAttribute("fill", "#88888833");
    path.setAttribute("stroke", "none");
    path.setAttribute("pid", pid);
    path.setAttribute("class", `place blank p${pid}`);

    svg.appendChild(path);
}

function link(p1, p2) {
    var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    
    var d = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#ff000044");
    path.setAttribute("stroke-width", "0.004");

    svg.appendChild(path);
}

var go9={
    "length": 81,
    "center": [],
    "parent": [],
    "link": [],
    "size": [],
}

Array.from({length:81}).forEach((v,i)=>{
    let x=i%9
    let y=~~(i/9)
    const padl=0.14
    const padt=0.14
    const padr=0.16
    const padd=0.16
    const size=0.095
    // console.log(x,y)
    go9.center.push([
        -1+padl+(2-padl-padr)/8*x,
        -1+padt+(2-padt-padd)/8*y
    ])
    go9.parent.push(i==0?0:x==0?i-9:i-1)
    let pa=[]
    if (x!=0) pa.push(i-1)
    if (x!=8) pa.push(i+1)
    if (y!=0) pa.push(i-9)
    if (y!=8) pa.push(i+9)
    go9.link.push(pa)
    go9.size.push(size)
})

if(MODEL=='Square'){
    let robj=go9
    document.querySelector('.disc').style.backgroundImage="url('./images/go9.png')";

    if(1)Array.from(robj).forEach((v,ii) => {
        var [x1,y1]=robj['center'][ii]
        disc({ x: x1, y: y1 }, robj['size'][ii], ii)
    });
    
    document.querySelector('.p1').classList.add('ban')
    document.querySelector('.p1').classList.remove('blank')

    document.querySelector('.p5').classList.add('chess')
    document.querySelector('.p5').classList.remove('blank')
    
    document.querySelector('.p3').classList.add('critical')
}