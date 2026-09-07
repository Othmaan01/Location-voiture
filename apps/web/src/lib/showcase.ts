/**
 * Vehicules de demonstration (maquette de l'app, carrousel mobile). Photos Wikimedia Commons,
 * licences libres avec attribution (credits affiches dans les mentions legales).
 */
export interface ShowcaseCar {
  slug: string;
  name: string;
  price: string;
}

export interface ShowcaseLoueur {
  name: string;
  city: string;
  price: string;
  count: number;
  rating: string;
  cars: ShowcaseCar[];
}

export const SHOWCASE: ShowcaseLoueur[] = [
  {
    name: "Prestige Motors Paris",
    city: "Paris 8e · 2,1 km",
    price: "dès 390 €/j",
    count: 9,
    rating: "4,9",
    cars: [
      { slug: "audi-rs3", name: "Audi RS3", price: "390 €/j" },
      { slug: "lamborghini-urus", name: "Lamborghini Urus", price: "1 190 €/j" },
      { slug: "mercedes-g63", name: "Mercedes G63 AMG", price: "890 €/j" },
    ],
  },
  {
    name: "Citadines Lyon Part-Dieu",
    city: "Lyon 3e · 1,4 km",
    price: "dès 39 €/j",
    count: 24,
    rating: "4,8",
    cars: [
      { slug: "renault-clio-v", name: "Renault Clio V", price: "39 €/j" },
      { slug: "mercedes-classe-a", name: "Mercedes Classe A", price: "69 €/j" },
      { slug: "renault-captur", name: "Renault Captur", price: "49 €/j" },
    ],
  },
  {
    name: "Atlantique Loc Bordeaux",
    city: "Bordeaux · 3,6 km",
    price: "dès 45 €/j",
    count: 15,
    rating: "4,7",
    cars: [
      { slug: "peugeot-208", name: "Peugeot 208", price: "45 €/j" },
      { slug: "tesla-model-3", name: "Tesla Model 3", price: "119 €/j" },
      { slug: "volkswagen-tiguan", name: "Volkswagen Tiguan", price: "79 €/j" },
    ],
  },
];

export const PHOTO_CREDITS = [
  {
    slug: "audi-rs3",
    title: "Audi RS3 8Y Sedan 1X7A7298.jpg",
    artist: "Alexander-93",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Audi_RS3_8Y_Sedan_1X7A7298.jpg",
  },
  {
    slug: "lamborghini-urus",
    title: "Lamborghini Urus oblique view dllu 01.jpg",
    artist: "Dllu",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Lamborghini_Urus_oblique_view_dllu_01.jpg",
  },
  {
    slug: "mercedes-g63",
    title: "Mercedes-AMG G 63, GIMS 2018, Le Grand-Saconnex (1X7A0541).jpg",
    artist: "Matti Blume",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Mercedes-AMG_G_63,_GIMS_2018,_Le_Grand-Saconnex_(1X7A0541).jpg",
  },
  {
    slug: "renault-clio-v",
    title: "Renault Clio V 1X7A0392.jpg",
    artist: "Alexander Migl",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Renault_Clio_V_1X7A0392.jpg",
  },
  {
    slug: "mercedes-classe-a",
    title: "2019 Mercedes Benz A-Class Hatchback A 200 (18).jpg",
    artist: "Bindydad123",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:2019_Mercedes_Benz_A-Class_Hatchback_A_200_(18).jpg",
  },
  {
    slug: "renault-captur",
    title: "Renault Captur II 1X7A1982.jpg",
    artist: "Alexander-93",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Renault_Captur_II_1X7A1982.jpg",
  },
  {
    slug: "tesla-model-3",
    title: "Tesla Model 3 1X7A6940.jpg",
    artist: "Alexander-93",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Tesla_Model_3_1X7A6940.jpg",
  },
  {
    slug: "volkswagen-tiguan",
    title: "Volkswagen Tiguan II 1.4 TSI Comfortline Ruby Red 02.jpg",
    artist: "Ethan Llamas",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Volkswagen_Tiguan_II_1.4_TSI_Comfortline_Ruby_Red_02.jpg",
  },
  {
    slug: "peugeot-208",
    title: "Peugeot e-208 Allure (II) – f 26122020.jpg",
    artist: "© M 93",
    license: "CC BY-SA 3.0 de",
    page: "https://commons.wikimedia.org/wiki/File:Peugeot_e-208_Allure_(II)_%E2%80%93_f_26122020.jpg",
  },
];
