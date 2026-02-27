import { useRef, useEffect } from 'react';
import Slider from 'react-slick';
import { useComputedColorScheme } from '@mantine/core';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

interface ClientLogo {
  src: string;
  alt: string;
}

const mockdata: ClientLogo[] = [
  { src: '/src/assets/svg/clients-logo/amazon.svg', alt: 'Amazon' },
  { src: '/src/assets/svg/clients-logo/fedex.svg', alt: 'FedEx' },
  { src: '/src/assets/svg/clients-logo/samsung.svg', alt: 'Samsung' },
  { src: '/src/assets/svg/clients-logo/google.svg', alt: 'Google' },
  { src: '/src/assets/svg/clients-logo/lululemon.svg', alt: 'Lululemon' },
  { src: '/src/assets/svg/clients-logo/jeep.svg', alt: 'Jeep' },
];

const duplicatedData = [...mockdata, ...mockdata];

export function ClientsCarousel() {
  const sliderRef = useRef<Slider>(null);
  const computedColorScheme = useComputedColorScheme('light');

  useEffect(() => {
    sliderRef.current?.slickPlay();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      sliderRef.current?.slickPause();
      sliderRef.current?.slickPlay();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [computedColorScheme]);

  const settings = {
    autoplay: true,
    autoplaySpeed: 0,
    speed: 18000,
    cssEase: 'linear',
    infinite: true,
    slidesToShow: 6,
    slidesToScroll: 1,
    arrows: false,
    dots: false,
    pauseOnHover: false,
    pauseOnFocus: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 4,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 576,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  const clients = duplicatedData.map((logo, index) => (
    <div key={`${logo.alt}-${index}`} className="px-4">
      <img
        src={logo.src}
        alt={logo.alt}
        className="h-12 w-auto mx-auto grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
      />
    </div>
  ));

  return (
    <div className="w-full overflow-hidden">
      <Slider ref={sliderRef} {...settings}>
        {clients}
      </Slider>
    </div>
  );
}
