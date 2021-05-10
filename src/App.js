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

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);

  const onMapClick = React.useCallback((e) => {
    localStorage.setItem('busStopCount', parseInt(localStorage.getItem('busStopCount'), 10) + 1); // her durak eklemesinde 1 artırıyorum
    setMarkers((current) => [
      ...current,
      {
        num: parseInt(localStorage.getItem('busStopCount')),
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        studentNum: 0,
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
    let stopsArr = Array(markers.length).fill(0).map(row => new Array(4).fill(0));
    let index = 0;
    markers.forEach(m => {
      stopsArr[index++] = [
        (m.num - 1),
        (m.lat.toFixed(2) * 100),
        (m.lng.toFixed(2) * 100),
        m.studentNum,
      ];
    });
    console.log(stopsArr); //şimdilik console da yazdırdım, hangi halde daha iyi olur diyorsanız ona göre arrayle ya da stringle request atarız
    
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

    // lambda call - güvenlik için onu da env'tan okuyor 
    const api = process.env.REACT_APP_AWS_LAMBDA_URL;
    axios
      .post(api, request)
      .then((response) => {
        console.log(response.data);
      })
      .catch((error) => {
        console.log(error);
      });

    /* 
    this method draws the route.
    instead of markers, it should take the produced route by the algorithm.
    we can change the output format of the algorithm. for example like:
    [
    {
      bus: 1,
      busStops: [
        {lat: 42.20, lng: 36.40},
        {lat: 45.30, lng: 32.10},
      ]
    },
    {
      bus: 2,
      busStops: [
        {lat: 42.20, lng: 36.40},
        {lat: 45.30, lng: 32.10},
      ]
    }
    ...
    ]
    */
    initMap(markers, mapRef.current);
  };
  
  return (
    <div>
      {/* // bu şekilde fonksiyon çağırmış oluyorum. daha temiz görünüyor */}
      <Routerella/>

      <GoogleMap id="map" mapContainerStyle={mapContainerStyle} zoom={8} center={center} options={options} onClick={onMapClick} onLoad={onMapLoad}>
        <h1>Add School and Bus Stops <img src = { school } alt = "school" height = { 30 } width = { 50 } /></h1>
        <Locate panTo={panTo} />
        <Search panTo={panTo} />
        {markers.map((marker) => (
          <Marker
            key={`${marker.lat}-${marker.lng}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            onClick={() => {
              setSelected(marker);
            }}
            icon={{
              // bu şekilde okul - otobüs durağı ayrımını yapıyorum
              url: marker.num === 1 ? schoolIconForMap : busStopIconForMap,
              origin: new window.google.maps.Point(0, 0),
              anchor: new window.google.maps.Point(15, 15),
              scaledSize: new window.google.maps.Size(30, 30),
            }}
          />
        ))}

        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => {
              setSelected(null);
            }}
          >
            <div>
              <InformationBox isSchool = {selected.num === 1}/>
              {/* virgülden sonraki 3 basamak için toFixed kullandım */}
              <p>Latitude: {selected.lat.toFixed(3)}</p>
              <p>Longitude: {selected.lng.toFixed(3)}</p>
              <p>Number: {selected.num}</p>
              <p>Student Number: {selected.studentNum}</p>

              {/* student sayısını alıp eklemek için selected marker da parametre verdim*/}
              <StudentNumberForm isSchool = {selected.num === 1} selected = {selected}/> 

            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>

      <BusNumberForm/>

      <BusCapacityForm/>

      <OptimalityForm/>
      <button onClick = {handleClick}> RUN! </button>
    </div>
  );
}

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

// bu fonksiyon üzerinde bastığımızda çıkan bilgi ekranı için. okulsa okul yazsın, duraksa durak diye 
function InformationBox({ isSchool }) {
  if (isSchool) {
    return (
      <div>
        <h2>
          <span role="img" aria-label="school">🏫  </span>{" "} School
        </h2>
      </div>
    );
  }
  return (
    <div>
      <h2>
        <span role="img" aria-label="busstop">🚏  </span>{" "} Bus Stop
      </h2>
    </div>
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-control">
        <label>Student Number</label>
          <input
          type="number"
          name="studentNumber"
          ref={register}/>
      </div>
      <div className="form-control">
      <label></label>
      <button type="submit">OK</button>
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
          <input
            type="number" // sadece sayı değeri girilebilmesi için böyle bir şey ekledim
            name="busNumber"
            ref={register}
          />
          <button type="submit"> OK </button>
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
          <input
            type="number" // sadece sayı değeri girilebilmesi için böyle bir şey ekledim
            name="busCapacity"
            ref={register}
          />
          <button type="submit"> OK </button>
        </div>
      </form>
   </div>
  );
}

// bu da optimallik seviyesi için. bunu aslında 0'dan başlayıp yukarı çıkan şekilde değilde 3 farklı kutucuk gibi olsa daha iyi olur gibi sanki
function OptimalityForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    localStorage.setItem('optimalityDegree', data.optimalityDegree);
  };

  return (
    <div> 
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="form-control">
      <label>Enter the optimality level (Note: This may affect the calculation time!): </label>
        <input
          type="number"
          name="optimalityDegree"
          ref={register}
        />
        <button type="submit"> OK </button>
      </div>
    </form>
    </div>
  );
}

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

function initMap(markers, map) {
  // after it takes the produced routes as input,
  // for each bus, it should create the coordinates and should run setMap function
  
  // for example - first route
  const coordinates = [
    { lat: markers[1].lat, lng: markers[1].lng },
    { lat: markers[0].lat, lng: markers[0].lng },
  ];
  const route = new window.google.maps.Polyline({
    path: coordinates,
    geodesic: true,
    strokeColor: "#7E1E9A",
    strokeOpacity: 5.0,
    strokeWeight: 4,
  });
   
  // for example - second route
  const coordinates2 = [
    { lat: markers[2].lat, lng: markers[2].lng },
    { lat: markers[3].lat, lng: markers[3].lng },
    { lat: markers[0].lat, lng: markers[0].lng },
  ];
  const route2 = new window.google.maps.Polyline({
    path: coordinates2,
    geodesic: true,
    strokeColor: "#7E1E9A",
    strokeOpacity: 5.0,
    strokeWeight: 4,
  });

  route.setMap(map);
  route2.setMap(map);
}
