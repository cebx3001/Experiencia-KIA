export const campaign={
 release:'cines-20261113-r1',url:'https://cebx3001.github.io/Experiencia-KIA/experiencia/',
 brandFontUrl:null,expectedBrandFont:'experiencia/assets/KiaSignatureRegular.woff2',
 whatsappNumber:null,whatsappMessage:'Hola, quiero agendar un test drive de la Kia Tasman en Ecuador.',
 kiaUrl:'https://www.kia.com/ec/main.html',
 missions:[
  {id:'vadeo',name:'Vadeo',icon:'≋',eyebrow:'CAPACIDAD DE VADEO',value:'800',unit:'mm',description:'Cruza ríos de hasta 800 mm de profundidad.',chips:['A 7 km/h','Toma de aire elevada']},
  {id:'carga',name:'Carga',icon:'◇',eyebrow:'CAPACIDAD DE CARGA',value:'1,2',unit:'toneladas',description:'Carga útil de hasta 1,2 t para el trabajo pesado.',chips:['Rieles ajustables','Gradas laterales']},
  {id:'remolque',name:'Remolque',icon:'↝',eyebrow:'CAPACIDAD DE REMOLQUE',value:'3.500',unit:'kg',description:'Con control integrado de freno que se ajusta al peso del remolque.',chips:['Freno integrado']},
  {id:'todoterreno',name:'Todoterreno',icon:'⌁',eyebrow:'CONDUCCIÓN TODOTERRENO',value:'X-TREK',unit:'+ Modo Roca',description:'Avanza a baja velocidad constante en terreno difícil. Modo Roca exclusivo de la versión X-Pro.',chips:['4WD 4L','e-LD','Ground View Monitor']},
  {id:'interior',name:'Interior y tecnología',icon:'◉',eyebrow:'INTERIOR Y TECNOLOGÍA',value:'5',unit:'asistentes ADAS',description:'Frenado de emergencia, mantenimiento de carril, crucero inteligente, vista 360° y monitor de punto ciego.',chips:['SVM 360°','BVM']}
 ]
};
export function whatsappUrl(number=campaign.whatsappNumber){return number&&/^\d{8,15}$/.test(number)?`https://wa.me/${number}?text=${encodeURIComponent(campaign.whatsappMessage)}`:null;}
