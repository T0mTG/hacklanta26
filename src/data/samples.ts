// The ten pictures from dist/references/pics, copied to public/samples. They are the "try one of these" shelf.
export interface Sample { id: string; file: string; title: string; story: string }

export const SAMPLES: Sample[] = [
  { id: 'dog', file: 'dog.webp', title: 'Happy Dog', story: 'A very good dog guarding its red doghouse.' },
  { id: 'family', file: 'family.webp', title: 'My Family', story: 'Everyone holding hands in the sunshine.' },
  { id: 'whale', file: 'whale.jpg', title: 'Baby Whale', story: 'A little whale who loves to splash.' },
  { id: 'bird', file: 'bird.jpg', title: 'Yellow Bird', story: 'A cheerful bird with a bright pink tail.' },
  { id: 'house', file: 'house.jpg', title: 'Lake House', story: 'A cozy house by the lake, with kites in the sky.' },
  { id: 'chameleon', file: 'chameleon.jpg', title: 'Rainbow Chameleon', story: 'A chameleon wearing every color at once.' },
  { id: 'buddy', file: 'buddy.jpg', title: 'Waving Buddy', story: 'A buddy in blue overalls saying hello!' },
  { id: 'monster', file: 'monster.jpg', title: 'Scribble Monster', story: 'A very fuzzy monster. Do not worry, it is friendly.' },
  { id: 'planet', file: 'planet.jpg', title: 'Our Green Planet', story: 'A little planet with balloons and a happy sun.' },
  { id: 'ship', file: 'ship.jpg', title: 'Big Ship', story: 'A big ship sailing across the blue sea.' },
]

export const sampleUrl = (s: Sample) => `/samples/${s.file}`
