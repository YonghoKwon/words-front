import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ActionIcon, AppShell, Box, Container, Group, Text, useMantineColorScheme } from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { WordStudyPage } from './pages/WordStudyPage';
import { WordListPage } from './pages/WordListPage';
import NormalPage from './pages/NormalPage';
import { Navigation } from './components/Navigation';
import './App.css';

function ColorSchemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <ActionIcon
      variant="subtle"
      size="lg"
      radius="xl"
      onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle color scheme"
    >
      {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

function App() {
  return (
    <Router>
      <AppShell padding="xs">
        <Container className="app-shell-container" size="sm" px={6}>
          <Group className="app-topbar" justify="space-between" mb={8}>
            <Text fw={800} c="blue.1" style={{ letterSpacing: 0 }}>Words</Text>
            <ColorSchemeToggle />
          </Group>

          <Box className="app-nav-wrap" mb="sm">
            <Navigation />
          </Box>

          <Routes>
            <Route path="/" element={<WordStudyPage />} />
            <Route path="/words" element={<WordListPage />} />
            <Route path="/normal" element={<NormalPage />} />
          </Routes>
        </Container>
      </AppShell>
    </Router>
  );
}

export default App;
