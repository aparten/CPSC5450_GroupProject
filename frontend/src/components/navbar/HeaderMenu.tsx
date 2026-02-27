import whiteLogoUrl from "@/assets/svg/Company-Logo_White.svg";
import blackLogoUrl from "@/assets/svg/Company-Logo_Black.svg";
import { IconChevronDown } from '@tabler/icons-react';
import { ActionIcon, Burger, Center, Container, Group, Menu, useMantineColorScheme, useComputedColorScheme, } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBrightnessDown, IconMoon } from '@tabler/icons-react';
import classes from './HeaderMenu.module.css';
import { Link, useNavigate } from "@tanstack/react-router";

const links = [
  { link: '/about', label: 'Features' },
  {
    link: '#1',
    label: 'Learn',
    links: [
      { link: '/docs', label: 'Documentation' },
      { link: '/resources', label: 'Resources' },
      { link: '/community', label: 'Community' },
      { link: '/blog', label: 'Blog' },
    ],
  },
  { link: '/about', label: 'About' },
  { link: '/pricing', label: 'Pricing' },
  {
    link: '#2',
    label: 'Support',
    links: [
      { link: '/faq', label: 'FAQ' },
      { link: '/demo', label: 'Book a demo' },
      { link: '/forums', label: 'Forums' },
    ],
  },
];



export function HeaderMenu() {

  // Hooks to manage color scheme
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const computedColorScheme = useComputedColorScheme('light');

  const toggleColorScheme = () => {
    setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark');
  };

  const [opened, { toggle }] = useDisclosure(false);

  // Choose logo based on color scheme
  const logoSrc = colorScheme === 'dark' ? whiteLogoUrl : blackLogoUrl;

  // Used for logo navigation
  const navigate = useNavigate()

  // Generate menu items based on the links array
  const items = links.map((link) => {
    const menuItems = link.links?.map((item) => (
      <Menu.Item key={item.link}>{item.label}</Menu.Item>
    ));

    if (menuItems) {
      return (
        <Menu key={link.label} trigger="hover" transitionProps={{ exitDuration: 0 }} withinPortal>
          <Menu.Target>
            <a
              href={link.link}
              className={classes.link}
              onClick={(event) => event.preventDefault()}
            >
              <Center>
                <span className={classes.linkLabel}>{link.label}</span>
                <IconChevronDown size={14} stroke={1.5} />
              </Center>
            </a>
          </Menu.Target>
          <Menu.Dropdown>
            {menuItems}
          </Menu.Dropdown>

        </Menu>
      );
    }

    return (
      <a
        key={link.label}
        href={link.link}
        className={classes.link}
        onClick={(event) => event.preventDefault()}
      >
        {link.label}
      </a>
    );
  });

  return (
    <header className={classes.header}>
      <Container size="md">
        <div className={classes.inner}>
          <img
            src={logoSrc}
            width={175}
            height={100}
            alt="Company logo"
            onClick={() => navigate({ to: "/" })}
            style={{ cursor: 'pointer' }}
          />
          <Group gap={5} visibleFrom="sm">
            {items}
            <ActionIcon
              variant="default"
              size="lg"
              aria-label="Disabled and not interactive"
              onClick={() => toggleColorScheme()}>
              {colorScheme === 'dark' ? <IconBrightnessDown /> : <IconMoon />}
            </ActionIcon>
          </Group>
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            hiddenFrom="sm"
            aria-label="Toggle navigation"
          />
        </div>
      </Container>
    </header>
  );
}
