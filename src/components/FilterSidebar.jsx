import React from 'react';
import ServiceSelector from './ServiceSelector';

const FilterSidebar = ({ search, setSearch, category, setCategory, state, setState, city, setCity, allCategories }) => {
  // Nigerian states and their cities
  const stateCities = {
    "Lagos": ["Lagos", "Victoria Island", "Ikoyi", "Surulere", "Yaba", "Mushin", "Oshodi", "Ikeja", "Apapa", "Lekki", "Ajah", "Badagry", "Epe", "Ikorodu", "Alimosho", "Kosofe"],
    "Abuja": ["Abuja", "Garki", "Wuse", "Maitama", "Asokoro", "Lugbe", "Kubwa", "Gwarinpa", "Nyanya", "Karu", "Jahi", "Lokogoma"],
    "Rivers": ["Port Harcourt", "Obio-Akpor", "Eleme", "Okrika", "Ogu-Bolo", "Degema", "Bonny", "Andoni", "Khana", "Oyigbo", "Opobo-Nkoro", "Tai"],
    "Edo": ["Benin", "Auchi", "Ekpoma", "Uromi", "Igarra", "Ovia North-East", "Ovia South-West", "Owan East", "Owan West", "Orhionmwon"],
    "Kano": ["Kano", "Gwale", "Nassarawa", "Fagge", "Dala", "Tarauni", "Kumbotso", "Ungogo", "Kano Municipal", "Gezawa", "Minjibir", "Bichi"],
    "Oyo": ["Ibadan", "Ogbomoso", "Oyo", "Iseyin", "Saki", "Kishi", "Igboho", "Eruwa", "Lanlate", "Igbo-Ora", "Idere", "Fiditi"],
    "Kaduna": ["Kaduna", "Zaria", "Kafanchan", "Saminaka", "Ikara", "Makarfi", "Kagoro", "Kagarku", "Kajuru", "Jema'a", "Kachia", "Kaura"],
    "Delta": ["Asaba", "Warri", "Sapele", "Ughelli", "Agbor", "Oghara", "Oleh", "Koko", "Burutu", "Patani", "Bomadi", "Isoko"],
    "Enugu": ["Enugu", "Nsukka", "Oji-River", "Awgu", "Aninri", "Nkanu East", "Nkanu West", "Igbo-Etiti", "Igbo-Eze North", "Igbo-Eze South", "Isi-Uzo", "Nkanu"],
    "Akwa Ibom": ["Uyo", "Ikot Ekpene", "Eket", "Abak", "Oron", "Ibeno", "Mkpat-Enin", "Nsit-Atai", "Nsit-Ibom", "Nsit-Ubium", "Obot-Akara", "Okobo"],
    "Cross River": ["Calabar", "Ogoja", "Ikom", "Obudu", "Akamkpa", "Biase", "Boki", "Etung", "Yakuur", "Yala", "Abi", "Bakassi"],
    "Plateau": ["Jos", "Bukuru", "Barkin Ladi", "Riyom", "Mangu", "Pankshin", "Kanam", "Kanke", "Langtang North", "Langtang South", "Wase", "Mikang"],
    "Bauchi": ["Bauchi", "Azare", "Misau", "Jama'are", "Katagum", "Ningi", "Warji", "Ganjuwa", "Kirfi", "Alkaleri", "Tafawa Balewa", "Bogoro"],
    "Borno": ["Maiduguri", "Konduga", "Bama", "Gwoza", "Kukawa", "Mafa", "Mobbar", "Monguno", "Ngala", "Nganzai", "Shani", "Abadam"],
    "Adamawa": ["Yola", "Mubi", "Jimeta", "Numan", "Ganye", "Girei", "Gombi", "Hong", "Jada", "Lamurde", "Madagali", "Maiha"],
    "Benue": ["Makurdi", "Gboko", "Katsina-Ala", "Konshisha", "Kwande", "Logo", "Obi", "Ogbadibo", "Ohimini", "Oju", "Okpokwu", "Otukpo"],
    "Kogi": ["Lokoja", "Okene", "Kabba", "Ankpa", "Dekina", "Ibaji", "Idah", "Igalamela-Odolu", "Ijumu", "Koton-Karfe", "Mopa-Muro", "Ofu"],
    "Niger": ["Minna", "Bida", "Kontagora", "Suleja", "Agaie", "Agwara", "Borgu", "Bosso", "Chanchaga", "Edati", "Gbako"],
    "Katsina": ["Katsina", "Dutsin-Ma", "Faskari", "Ingawa", "Jibia", "Kafur", "Kaita", "Kankara", "Kankia", "Kurfi", "Kusada"],
    "Sokoto": ["Sokoto", "Binji", "Bodinga", "Dange-Shuni", "Gada", "Goronyo", "Gudu", "Gwadabawa", "Illela", "Isa", "Kebbe", "Kware"],
    "Kebbi": ["Birnin Kebbi", "Aleiro", "Arewa-Dandi", "Argungu", "Augie", "Bagudo", "Bunza", "Dandi", "Fakai", "Gwandu", "Jega", "Kalgo"],
    "Zamfara": ["Gusau", "Anka", "Bakura", "Birnin-Magaji", "Bukkuyum", "Bungudu", "Chafe", "Gummi", "Kankara", "Kaura-Namoda", "Maradun", "Maru"],
    "Jigawa": ["Dutse", "Auyo", "Babura", "Biriniwa", "Birnin-Kudu", "Buji", "Garki", "Gumel", "Guri", "Gwaram", "Gwiwa"],
    "Yobe": ["Damaturu", "Bade", "Bursari", "Fika", "Fune", "Geidam", "Gujba", "Gulani", "Jakusko", "Karasuwa", "Machina", "Nangere"],
    "Ebonyi": ["Abakaliki", "Afikpo North", "Afikpo South", "Ebonyi", "Ezza North", "Ezza South", "Ikwo", "Ishielu", "Ivo", "Izzi", "Ohaozara", "Ohaukwu"],
    "Imo": ["Owerri", "Aboh-Mbaise", "Ahiazu-Mbaise", "Ehime-Mbano", "Ezinihitte", "Ideato North", "Ideato South", "Ihitte-Uboma", "Ikeduru", "Isiala-Mbano", "Isu", "Mbaitoli"],
    "Abia": ["Umuahia", "Aba", "Arochukwu", "Bende", "Ikwuano", "Isiala-Ngwa North", "Isiala-Ngwa South", "Isuikwuato", "Obi-Ngwa", "Ohafia", "Osisioma", "Ugwunagbo"],
    "Anambra": ["Awka", "Onitsha", "Nnewi", "Aguata", "Anambra East", "Anambra West", "Anaocha", "Ayamelum", "Dunukofia", "Ekwusigo", "Idemili North", "Idemili South"],
    "Ogun": ["Abeokuta", "Sagamu", "Ijebu-Ode", "Ilaro", "Ado-Odo-Ota", "Egbado North", "Egbado South", "Ewekoro", "Ifo", "Ijebu-East", "Ijebu-North", "Ijebu-North-East"],
    "Ondo": ["Akure", "Ondo", "Owo", "Ikare", "Akoko North-East", "Akoko North-West", "Akoko South-East", "Akoko South-West", "Akure North", "Akure South", "Ese-Odo", "Idanre"],
    "Osun": ["Osogbo", "Ife", "Ilesha", "Ede", "Ikire", "Ile-Ife", "Atakunmosa East", "Atakunmosa West", "Aiyedaade", "Aiyedire", "Boluwaduro", "Boripe"],
    "Ekiti": ["Ado-Ekiti", "Ikere-Ekiti", "Oye-Ekiti", "Aramoko-Ekiti", "Efon", "Ekiti-East", "Ekiti-South-West", "Ekiti-West", "Emure", "Gbonyin", "Ido-Osi", "Ijero"],
    "Bayelsa": ["Yenagoa", "Brass", "Ekeremor", "Kolokuma/Opokuma", "Nembe", "Ogbia", "Sagbama", "Southern Ijaw"],
    "Taraba": ["Jalingo", "Ardo-Kola", "Bali", "Donga", "Gashaka", "Gassol", "Ibi", "Karim-Lamido", "Kurmi", "Lau", "Sardauna", "Takum", "Ussa", "Wukari", "Yorro"],
    "Gombe": ["Gombe", "Akko", "Balanga", "Billiri", "Dukku", "Funakaye", "Kwami", "Nafada", "Shongom", "Yamaltu/Deba"],
    "Nasarawa": ["Lafia", "Akwanga", "Awe", "Doma", "Karu", "Keana", "Keffi", "Kokona", "Nasarawa", "Nasarawa-Eggon", "Obi", "Toto", "Wamba"],
    "Kwara": ["Ilorin", "Asa", "Baruten", "Edu", "Ekiti", "Ifelodun", "Irepodun", "Isin", "Kaiama", "Moro", "Offa", "Oke-Ero", "Oyun", "Pategi"]
  };

  const handleStateChange = (e) => {
    const selectedState = e.target.value;
    setState(selectedState);
    setCity(''); // Reset city when state changes
  };
  return (
    <aside className="w-full md:w-64 bg-white border p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-700">Filter Services</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">Search Services</label>
        <ServiceSelector
          value={search}
          onChange={setSearch}
          placeholder="Search for a service..."
          showSuggestions={true}
          allowCustom={true}
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">All Categories</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">State</label>
        <select
          value={state}
          onChange={handleStateChange}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">All States</option>
          {Object.keys(stateCities).map((stateName) => (
            <option key={stateName} value={stateName}>{stateName}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
          disabled={!state}
        >
          <option value="">All Cities</option>
          {state && stateCities[state] ? (
            stateCities[state].map((cityName) => (
              <option key={cityName} value={cityName}>{cityName}</option>
            ))
          ) : (
            <option value="" disabled>Please select a state first</option>
          )}
        </select>
      </div>
    </aside>
  );
};

export default FilterSidebar;