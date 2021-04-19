import React from "react";

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

import { formatRelative } from "date-fns";
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
  height: "80vh",
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
localStorage.setItem('maxBusStop', 0); // otobüs sayısı için
localStorage.setItem('optimalityDegree', 0); // otobüs sayısı için

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);

  const onMapClick = React.useCallback((e) => {
    localStorage.setItem('busStopCount', parseInt(localStorage.getItem('busStopCount'), 10) + 1); // her durak eklemesinde 1 artıtıyorum
    setMarkers((current) => [
      ...current,
      {
        num: parseInt(localStorage.getItem('busStopCount')),
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        time: new Date(),
      },
    ]);
  }, []);

  const mapRef = React.useRef();
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({ lat, lng, busStopCount }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(20);
  }, []);

  if (loadError) return "Error";
  if (!isLoaded) return "Loading...";

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
              <p>Added on: {formatRelative(selected.time, new Date())}</p>
              {/* virgülden sonraki 3 basamak için toFixed kullandım */}
              <p>Latitude: {selected.lat.toFixed(3)}</p>
              <p>Longitude: {selected.lng.toFixed(3)}</p>
              <p>Number: {selected.num}</p>

              {/* öğrenci sayısını alabilmek için açtım bu formu. email falan kopyala yapıştırdan geldi muhtemelen */}
              <StudentNumberForm isSchool = {selected.num === 1}/>

            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>

      {/* // yine daha temiz görünsün diye bu formları da böyle gösterdim. ama bu ikisi de henüz işlevini yerine getiremiyor */}
      <BusNumberForm/>

      <OptimalityForm/>
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
function StudentNumberForm({ isSchool }) {
  // const onFormSubmit2 = React.useCallback((value) => {
  //   localStorage.setItem('maxBusStop', value); // her durak eklemesinde 1 artıtıyorum
  // }, []);

  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);
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
    // <div className="App">
    //   <form onSubmit={handleSubmit(onSubmit)}>
    //     <div className="form-control">
    //       <label>Email</label>
    //       <input type="text" name="email" ref={register} />
    //     </div>
    //     <div className="form-control">
    //       <label>Password</label>
    //       <input type="password" name="password" ref={register} />
    //     </div>
    //     <div className="form-control">
    //       <label></label>
    //       <button type="submit">Login</button>
    //     </div>
    //   </form>
    // </div>
  );
}

// bu da otobüs sayısını alabilmek için ama çalışmıyor henüz :/
function BusNumberForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    localStorage.setItem('maxBusStop', data.busNumber); // her durak eklemesinde 1 artıtıyorum
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

// bu da optimallik seviyesi için. bunu aslında 0'dan başlayıp yukarı çıkan şekilde değilde 3 farklı kutucuk gibi olsa daha iyi olur gibi sanki
function OptimalityForm() {
  const { register, handleSubmit } = useForm();

  const onSubmit = (data) => {
    console.log(data);
    localStorage.setItem('optimalityDegree', data.optimalityDegree); // her durak eklemesinde 1 artıtıyorum
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
      const busStopCount = localStorage.getItem('busStopCount');
      panTo({ lat, lng, busStopCount });
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
