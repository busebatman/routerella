import React from "react";
import axios from "axios";

import { useForm } from "react-hook-form";

import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";

import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";

import "@reach/combobox/styles.css";
import mapStyles from "./mapStyles";

//tüm renklerin hex kodlarını ayrı dosyaya yazdım yaklaşık 140 150 tane var ordan çekiyor :)
import {colorValues} from "./colors.js";  

// ------------- images -----------------
import routerella from "./images/routerella3.png"
import school from "./images/school3.png"
import schoolIconForMap from "./images/school.jpeg"
import busStopIconForMap from "./images/bus_stop.jpeg"
//-----------------------------------------------------------------

const libraries = ["places"];

const mapContainerStyle = {
  height: "78vh",
  width: "100vw",
};

const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true,
};

const center = {
  lat: 41.6532,
  lng: 28.3832,
};
//-----------------------------------------------------------------

localStorage.setItem('busStopCount', 0); // böyle bir değişken tutuyorum ve 0'dan başlatıyorum. her eklendiğinde 1 artıracağım.
localStorage.setItem('maxBusCount', 1); // otobüs sayısı için - default 1
localStorage.setItem('busCapacity', 16); // optimallik seviyesi için - default 16
localStorage.setItem('optimalityDegree', 1); // optimallik seviyesi için - default 1
localStorage.setItem('lastBusStopCount', 0); // okul silerse yeniden okul eklerken son kalınan count tutsun diye koydum

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);

  const onMapClick = React.useCallback((e) => {
    //okul sildikten sonra ilk eklenecek durak için kaldığı yerden devam etsin diye 
    if (parseInt(localStorage.getItem('lastBusStopCount')) !== 0 && parseInt(localStorage.getItem('busStopCount')) !== 0){
      localStorage.setItem('busStopCount', parseInt(localStorage.getItem('lastBusStopCount'), 10) + 1); //kalınan durağı asıl counta verip kalınanı 0lıyor      
      localStorage.setItem('lastBusStopCount', 0); 
    }
    else { //normal case
      localStorage.setItem('busStopCount', parseInt(localStorage.getItem('busStopCount'), 10) + 1); // her durak eklemesinde 1 artırıyorum
    }

    const busStopIndex = parseInt(localStorage.getItem('busStopCount'));

    setMarkers((current) =>[
      ...current,
      {
        num: busStopIndex,
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        studentNum: busStopIndex === 1 ? 0 : 1, // default 0 for school - 1 for busStops
      },
    ]);
  }, []);

  const mapRef = React.useRef();
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(20);
  }, []);

  if (loadError) return "Error";
  if (!isLoaded) return "Loading...";

  const handleClick = () => {  //en son istek atmak için buton click ile json da toparlıyorum tüm inputları
    //array haliyle denedim aynısını değiştirmeye gerek kalmaz belki diye düşündüm bu haliyle direk python kodumuzdaki stops[] haliyle oluşmuş oluyor
    // console.log(markers)
    let stopsArr = Array(markers.length).fill(0).map(row => new Array(4).fill(0));
    let index = 0;
    markers.forEach(m => {
      stopsArr[index++] = [
        (m.num - 1),
        parseInt((m.lat * 100).toFixed(2),10), //dosyadan alınca floating point hatalı gibi bir şey oldu onu düzeltmek için biraz formatladım
        parseInt((m.lng * 100).toFixed(2),10),
        m.studentNum,
      ];
    });
    // console.log(stopsArr); //şimdilik console da yazdırdım, hangi halde daha iyi olur diyorsanız ona göre arrayle ya da stringle request atarız
    
    const request = (
      JSON.stringify({
        busStopCount: parseInt(localStorage.getItem('busStopCount'), 10),
        maxBusCount: parseInt(localStorage.getItem('maxBusCount'), 10),
        busCapacity: parseInt(localStorage.getItem('busCapacity'), 10),
        optimalityDegree: parseInt(localStorage.getItem('optimalityDegree'), 10),
        locations: stopsArr,
      })
    );
    console.log(request); //şimdilik console da yazıyor

    const api = process.env.REACT_APP_AWS_LAMBDA_URL;
    let finalRoutes;
    axios
      .post(api, request)
      .then((response) => {
        finalRoutes = response.data;
        // console.log(finalRoutes);
        initMap(finalRoutes, mapRef.current);
      })
      .catch((error) => {
        console.log(error);
      });
  };
 
  return (
    <div>
      {/* // bu şekilde fonksiyon çağırmış oluyorum. daha temiz görünüyor */}
      <Routerella/>
      {/*Ayrı fonksiyon olarak yaptım bunu da markerlar için setmarkerı gönderdim okula zoomlamak içinde panto yu */}
      <UploadFile setMarkers={setMarkers} panTo={panTo}/>
      <ClearStops markers={markers} onMapLoad={onMapLoad}/>
      <GoogleMap id="map" mapContainerStyle={mapContainerStyle} zoom={8} center={center} options={options} onClick={onMapClick} onLoad={onMapLoad}>
        <h1>Map <img src = { school } alt = "school" height = { 30 } width = { 50 } /></h1>
        <Locate panTo={panTo} />
        <Search panTo={panTo} />
        {markers.map((marker) => (
          <Marker
            key={`${marker.lat} - ${marker.lng}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            onClick={() => {
              setSelected(marker);
            }}
            icon={{
              // bu şekilde okul - otobüs durağı ayrımını yapıyorum
              url: marker.num === 1 ? schoolIconForMap : busStopIconForMap,
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(15, 15),
              scaledSize: new window.google.maps.Size(35, 35),
            }}
          />
        ))}
        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => {
              setSelected(null);
            }}>
            <div>
              <InformationBox isSchool = {selected.num === 1}/>
              {/* virgülden sonraki 3 basamak için toFixed kullandım */}
              {/* <p>Latitude: {selected.lat.toFixed(3)}</p>
              <p>Longitude: {selected.lng.toFixed(3)}</p>
              <p>Number: {selected.num}</p> */}
              <p> Total number of assigned students: {selected.studentNum} </p>

              {/* student sayısını alıp eklemek için selected marker da parametre verdim*/}
              <StudentNumberForm isSchool = {selected.num === 1} selected = {selected}/> 
              <p></p> {/* iki buton arası boşluk olsun diye koydum ama sonra düzeltir şekil verir 
              yan yana falan yaparız belki şimdilik işlev için alta ekledim
              silme içinde ayrı fonksiyon oluşturdum ama direk buraya da yazabiliriz formu sonra*/}
              <DeleteMarker selected = {selected} markers = {markers}/>
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>

      <BusNumberForm/>

      <BusCapacityForm/>

      {/* <OptimalityForm/> */}
      <p></p>
      <center> <button className="button" onClick = {handleClick}> RUN! </button> </center>
    </div>
  );
}
let lines;
// bu fonksiyon sadece logo için. logo çok küçük biliyorum :D 
// büyütünce piksel piksel oluyo ama çok hoşuma gitti ya :D zorunlu değil tabii ki böyle olması :D
function Routerella() {
  return (
    <div>
      <img src = { routerella } 
        alt = "routerella" 
        className = "center"
        height = { 100 }
        width = { 300 } />
    </div>
  );
}
function ClearStops({markers,onMapLoad}){

  const handleDeleteAll = () =>{
      markers.splice(0,markers.length)
      localStorage.setItem('busStopCount',0)
      lines.forEach(line=>{
        line.setMap(null)
      })
  }

  return(
    <div>
      <button onClick = {handleDeleteAll}> CLEAR ALL! </button>
    </div>
  )
}
//file upload fonksiyonu
function UploadFile({setMarkers,panTo}){

  //dosyadan değerleri alıp diğer methodlarda düzelttikten sonra zoomlayıp yerleştirmek için
  //şimdilik önceki formatımız öyleydi diye koordinatları 1234 gibi alıp sonra 12.34e çevirdim formatı değiştirip burda da güncelleyebiliriz zsonra
  const uploadClick = (coordArray) =>{
    panTo({
      lat: parseInt((coordArray[0][1]/100.0).toFixed(2)),
      lng: parseInt((coordArray[0][2]/100.0).toFixed(2)),
      zoomValue: 5});
    coordArray.forEach(stop => {
          localStorage.setItem('busStopCount', parseInt(localStorage.getItem('busStopCount'), 10) + 1);
    setMarkers((current) =>[
        ...current,
        {
          num: parseInt(stop[0])+1,
          lat: (parseInt(stop[1])/100.0),
          lng: (parseInt(stop[2])/100.0),
          studentNum: parseInt(stop[0])===0 ? 0 : parseInt(stop[3]),
        },
      ]);
    });
    
  };
//file operasyonları
  let fileReader;
  //ilk okuma methodu okuyup handle methoduna gönderiyor
  const onChange = e => {
    let file = e.target.files;
    fileReader = new FileReader();
    fileReader.onloadend = handleFileRead;
    fileReader.readAsText(file[0]);
    e.target.value = null;
  };

  //istenilen formata çevirmek için clean content methodunu çağırıyor sonrada upload methodunu çağırıyor yerleştirme için
  const handleFileRead = e => {
    let content = fileReader.result;
    content = cleanContent(content);
    uploadClick(content)
  };

  //string olarak aldığını önce arraye çeviriyor sonra da her durak için string ile tutulan değerleri 
  //(num,lat,lng,students) arraylere çevirip 2d array yapıp return ediyor
  const cleanContent = string => {
    string = string.replace(/^\s*[\r\n]/gm, "");
    let array = string.split(new RegExp(/[\r\n]/gm));
    let newArray=Array(array.length).fill(0).map(row => new Array(4).fill(0))
    let index=0
    array.forEach(stop => {
      stop=stop.split(' ')
      newArray[index]=stop
      index++
    });
    return newArray
  };

//stil çok kötü farkındayım :D şimdilik eklenebiliyor mu çalışıyor mu diye denedim değiştiririz 
  return(
    <div>
      <label>You can add school and bus stops by choosing from the map or uploading the coordination file : </label>
      <input className="button-right-2" type="file" name="myfile" onChange={onChange} />
    </div>
  )
}

// bu fonksiyon üzerinde bastığımızda çıkan bilgi ekranı için. okulsa okul yazsın, duraksa durak diye 
function InformationBox({ isSchool }) {
  if (isSchool) {
    return (
      <div>
        <center>
        <h2>
          <span role="img" aria-label="school"> 🏫 </span> School
        </h2>
        </center>
      </div>
    );
  }
  return (
    <div>
      <center>
      <h2>
        <span role="img" aria-label="busstop">🚏 </span> Bus Stop
      </h2>
      </center>
    </div>
  );
}

//marker silme fonksiyonu
function DeleteMarker({ selected, markers }){

  const { handleSubmit } = useForm()

  const handleDelete = (data) => {
    //bunu yoruma aldım alttaki kısımla isterseniz açabiliriz 
    //bir input box da Delete yazılmasını isteyip confirm ediyor yazılmadıysa silmiyor
    //if(data.confirmChoice==="Delete"){  
      
      var index = markers.indexOf(selected) //seçili markerın indexini buluyor
      
      if (index !== 0) {  //normal durak siliyorsam ondan sonrakilerin numberlarını 1 azaltıyorum. Zaten hata veriyor post etmiyor diğer türlü sıra bozulunca :D
        var ind = index + 1
        while(ind < markers.length){
          markers[ind].num--
          ind++;
        }
        localStorage.setItem('busStopCount', parseInt(localStorage.getItem('busStopCount'), 10) - 1);
      }
      else { //okul ise last count atıyorum asıl count 0lıyorum ilk eklenen okul olsun sonra devam etsin diye
        if (parseInt(localStorage.getItem('busStopCount'),10)!==1){
          localStorage.setItem('lastBusStopCount', parseInt(localStorage.getItem('busStopCount'), 10)); // en son kaldığım numarayı kaydediyorum
        }
        localStorage.setItem('busStopCount', 0); // okul eklemesi için 0lıyorum
      }

      //splice methodu tüm markerlar içinde verilen ilk parametre indexinden başlayıp ikinci parametre kadar marker siliyor
      var deleted = markers.splice(index, 1) 
      console.log(deleted)  //bunu kontrol için ekledim silebiliriz sonra
    //}
  }

  return (
    <form onSubmit = {handleSubmit(handleDelete)}>

      {/*<div className="form-control">
        <label>Confirm: Write \'Delete\'</label>
          <input
          type="name"
          name="confirmChoice"
          ref={register}/>
      </div>
  */}
      <div className="form-control">
      <center> <button type="submit"> Delete </button> </center>
      </div>
    </form>
  );
}

// bu formu da okul için öğrenci sayısı istemesin diye koydum 
// --- şuraya selected'ı ekledim. yoksa kızıyordu bende
function StudentNumberForm({ isSchool, selected }) {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    selected.studentNum = parseInt(data.studentNumber);
  };

  if (isSchool) {
    return null;
  }

  return (
    <form onSubmit = {handleSubmit(onSubmit)}>
      <div className = "form-control">
        <label>Enter total number of students: </label>
          <input
          type="number"
          name="studentNumber"
          ref={register}/>
          <button type="submit">OK</button>
      </div>
      <div className="form-control">
      </div>
    </form>
  );
}

// bu da otobüs sayısını alabilmek için
function BusNumberForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    localStorage.setItem('maxBusCount', data.busNumber);
  };

  return (
    <div> 
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-control">
        <label>Enter the maximum number of buses: </label>
          <button className="button-right" type="submit"> OK </button>

          <input
            className="button-right"
            type="number" // sadece sayı değeri girilebilmesi için böyle bir şey ekledim
            name="busNumber"
            ref={register}
          />
        </div>
      </form>
   </div>
  );
}

// otobüs kapasitesini alabilmek için
function BusCapacityForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    localStorage.setItem('busCapacity', data.busCapacity);
  };

  return (
    <div> 
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-control">
        <label>Enter the student capacity of buses: </label>
        <button className="button-right" type="submit"> OK </button>
          <input
            className="button-right"
            type="number" // sadece sayı değeri girilebilmesi için böyle bir şey ekledim
            name="busCapacity"
            ref={register}
          />
        </div>
      </form>
   </div>
  );
}

// bu da optimallik seviyesi için. bunu aslında 0'dan başlayıp yukarı çıkan şekilde değilde 3 farklı kutucuk gibi olsa daha iyi olur gibi sanki
// function OptimalityForm() {
//   const { register, handleSubmit } = useForm();

//   const onSubmit = (data) => {
//     localStorage.setItem('optimalityDegree', data.optimalityDegree);
//   };

//   return (
//     <div> 
//     <form onSubmit={handleSubmit(onSubmit)}>
//       <div className="form-control">
//       <label>Enter the optimality level (Note: This may affect the calculation time!) : </label>
//         <button className="button-right" type="submit"> OK </button>
//         <input
//           className="button-right"
//           type="number"
//           name="optimalityDegree"
//           ref={register}
//         />
//       </div>
//     </form>
//     </div>
//   );
// }

function Locate({ panTo }) {
  return (
    <button
      className="locate"
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            panTo({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          () => null
        );
      }}
    >
      <img src="/compass.svg" alt="compass" />
    </button>
  );
}

function Search({ panTo }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      location: { lat: () => 43.6532, lng: () => -79.3832 },
      radius: 100 * 1000,
    },
  });

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const handleSelect = async (address) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      panTo({ lat, lng  });
    } catch (error) {
      console.log("😱 Error: ", error);
    }
  };

  return (
    <div className="search">
      <Combobox onSelect={handleSelect}>
        <ComboboxInput
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Search your location"
        />
        <ComboboxPopover>
          <ComboboxList>
            {status === "OK" &&
              data.map(({ id, description }) => (
                <ComboboxOption key={id} value={description} />
              ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
}

function initMap(finalRoutes, map) {
  // console.log(colorValues)
  let colorIndex = Math.round(Math.random() * colorValues.length);  //random sayı alıp ona göre renk seçiyorum içerde de kontrol ediyorum aynı olmasın hiçbiri diye
  let indices = [finalRoutes.length]
  var i = 0
  lines=[finalRoutes.length];
  finalRoutes.forEach(route => {
    indices[i] = colorIndex
    // console.log(colorIndex,colorValues[colorIndex])
    const mapRoute = new window.google.maps.Polyline({
      path: route.busStops,
      geodesic: true,
      strokeColor: colorValues[colorIndex],
      strokeOpacity: 5.0,
      strokeWeight: 4,
    });
    lines[i]=mapRoute;
    mapRoute.setMap(map);

    colorIndex = Math.round(Math.random() * colorValues.length);
    while (indices.includes(colorIndex)) {
      colorIndex = Math.round(Math.random() * colorValues.length);
    }
    i++;
  });
}
