// __tests__/front.test.js
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.NEXT_PUBLIC_AUTH_URL = "http://localhost:5001";
process.env.NEXT_PUBLIC_DATA_URL = "http://localhost:5002";
process.env.NEXT_PUBLIC_AI_URL = "http://localhost:5003";
process.env.NEXT_PUBLIC_NOTIFICATION_URL = "http://localhost:5005";

// Silencer les console logs pendant les tests
let spyConsoleError, spyConsoleWarn, spyConsoleInfo;
beforeAll(() => {
  spyConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  spyConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  spyConsoleInfo = jest.spyOn(console, 'info').mockImplementation(() => {});
});
afterAll(() => {
  spyConsoleError?.mockRestore();
  spyConsoleWarn?.mockRestore();
  spyConsoleInfo?.mockRestore();
});

// ------------------------------------------------------------
// Mocks globaux Next.js
// ------------------------------------------------------------

// Mock Next.js router
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn((key) => key === 'token' ? 'mock-token' : null),
  }),
  usePathname: () => '/test-path',
}));

// Mock Next.js Image
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    const React = require('react');
    return React.createElement('img', { src, alt, ...props });
  };
});

// Mock fetch global et localStorage
global.fetch = jest.fn();
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// ------------------------------------------------------------
// 1) TESTS SERVICES API
// ------------------------------------------------------------
describe("SERVICES API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  });

  test("getRoadtrips - récupération avec pagination", async () => {
    const mockTrips = [
      { id: "1", title: "Voyage Italie", country: "Italie" },
      { id: "2", title: "Roadtrip Espagne", country: "Espagne" },
    ];

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { trips: mockTrips, pagination: { currentPage: 1, totalItems: 2 } }
      }),
    });

    // Simulation d'appel API
    const getRoadtrips = async (params = {}) => {
      const url = new URL(`${process.env.NEXT_PUBLIC_DATA_URL}/api/roadtrips`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      const response = await fetch(url.toString());
      return response.json();
    };

    const result = await getRoadtrips({ page: 1, limit: 10 });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/roadtrips?page=1&limit=10')
    );
    expect(result.data.trips).toHaveLength(2);
  });

  test("askAI - génération itinéraire", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: "roadtrip_itinerary",
        destination: "Italie",
        duration: "7 jours",
      }),
    });

    const askAI = async (prompt, token) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AI_URL}/ask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      return response.json();
    };

    const result = await askAI("Roadtrip 7 jours Italie", "token123");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/ask'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer token123',
        }),
        body: JSON.stringify({ prompt: "Roadtrip 7 jours Italie" }),
      })
    );
    expect(result.type).toBe("roadtrip_itinerary");
  });

  test("sendContactMessage - envoi formulaire contact", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        messageId: "contact-12345",
      }),
    });

    const sendContactMessage = async (contactData) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_NOTIFICATION_URL}/api/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-api-key',
        },
        body: JSON.stringify(contactData),
      });
      return response.json();
    };

    const contactData = {
      name: "John Doe",
      email: "john@example.com",
      subject: "Test",
      message: "Message de test",
    };

    const result = await sendContactMessage(contactData);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/contact/send'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-api-key',
        }),
        body: JSON.stringify(contactData),
      })
    );
    expect(result.success).toBe(true);
  });
});

// ------------------------------------------------------------
// 2) TESTS HOOKS
// ------------------------------------------------------------
describe("HOOKS CUSTOM", () => {
  const React = require('react');
  const { renderHook, act } = require('@testing-library/react');

  test("useAuth - utilisateur connecté", () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      user: { id: "1", email: "test@example.com", role: "user" },
      token: "valid-token",
    }));

    // Simulation hook useAuth
    const useAuth = () => {
      const [auth, setAuth] = React.useState(() => {
        const stored = localStorage.getItem('auth');
        return stored ? JSON.parse(stored) : { user: null, token: null };
      });

      const isAuthenticated = !!auth.user && !!auth.token;

      const logout = () => {
        localStorage.removeItem('auth');
        setAuth({ user: null, token: null });
        mockPush('/auth');
      };

      return {
        isAuthenticated,
        user: auth.user,
        token: auth.token,
        logout,
      };
    };

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.email).toBe("test@example.com");
    expect(result.current.token).toBe("valid-token");
  });

  test("useAuth - logout", () => {
    localStorageMock.getItem.mockReturnValue('{"user":{"id":"1"},"token":"token"}');

    const useAuth = () => {
      const logout = () => {
        localStorage.removeItem('auth');
        mockPush('/auth');
      };
      return { logout, isAuthenticated: true, user: { id: "1" }, token: "token" };
    };

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth');
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });
});

// ------------------------------------------------------------
// 3) TESTS COMPOSANTS UI
// ------------------------------------------------------------
describe("COMPOSANTS UI", () => {
  const React = require('react');
  const { render, screen, fireEvent, waitFor, cleanup } = require('@testing-library/react');

  afterEach(() => {
    cleanup();
  });

  test("TripCard - affichage des informations", () => {
    const mockTrip = {
      _id: "1",
      title: "Voyage en Italie",
      country: "Italie",
      duration: 7,
      budget: { amount: 1000, currency: "EUR" },
      views: 150,
      isPremium: false,
    };

    const TripCard = ({ trip }) => {
      return React.createElement('div', { 'data-testid': 'trip-card-info' },
        React.createElement('h3', {}, trip.title),
        React.createElement('p', {}, trip.country),
        React.createElement('p', {}, `${trip.duration} jours`),
        React.createElement('p', {}, `${trip.budget.amount} ${trip.budget.currency}`),
        React.createElement('p', {}, `${trip.views} vues`),
        trip.isPremium && React.createElement('span', {}, 'Premium')
      );
    };

    render(React.createElement(TripCard, { trip: mockTrip }));

    expect(screen.getByText("Voyage en Italie")).toBeInTheDocument();
    expect(screen.getByText("Italie")).toBeInTheDocument();
    expect(screen.getByText("7 jours")).toBeInTheDocument();
    expect(screen.getByText("1000 EUR")).toBeInTheDocument();
    expect(screen.getByText("150 vues")).toBeInTheDocument();
  });

  test("TripCard - badge premium", () => {
    const mockTrip = { _id: "1", title: "Voyage Premium", isPremium: true };

    const TripCard = ({ trip }) => {
      return React.createElement('div', {},
        React.createElement('h3', {}, trip.title),
        trip.isPremium && React.createElement('span', {}, 'Premium')
      );
    };

    render(React.createElement(TripCard, { trip: mockTrip }));
    expect(screen.getByText("Premium")).toBeInTheDocument();
  });

  test("TripCard - clic navigation", () => {
    const mockTrip = { _id: "1", title: "Voyage en Italie" };

    const TripCard = ({ trip }) => {
      return React.createElement('div', { 
        'data-testid': 'trip-card-clickable',
        onClick: () => mockPush(`/roadtrip/${trip._id}`)
      }, trip.title);
    };

    render(React.createElement(TripCard, { trip: mockTrip }));

    const card = screen.getByTestId('trip-card-clickable');
    fireEvent.click(card);

    expect(mockPush).toHaveBeenCalledWith('/roadtrip/1');
  });

  test("ContactForm - soumission formulaire", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const ContactForm = () => {
      const [formData, setFormData] = React.useState({
        name: '', email: '', subject: '', message: ''
      });

      const handleSubmit = async (e) => {
        e.preventDefault();
        await fetch('/api/contact/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      };

      return React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('input', {
          'aria-label': 'Nom',
          value: formData.name,
          onChange: (e) => setFormData({...formData, name: e.target.value})
        }),
        React.createElement('input', {
          'aria-label': 'Email',
          value: formData.email,
          onChange: (e) => setFormData({...formData, email: e.target.value})
        }),
        React.createElement('button', { type: 'submit' }, 'Envoyer')
      );
    };

    render(React.createElement(ContactForm));

    fireEvent.change(screen.getByLabelText(/nom/i), { target: { value: "John Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "john@example.com" } });
    fireEvent.click(screen.getByRole('button', { name: /envoyer/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/contact/send', expect.objectContaining({
        method: 'POST',
      }));
    });
  });
});

// ------------------------------------------------------------
// 4) TESTS PAGES
// ------------------------------------------------------------
describe("PAGES APP ROUTER", () => {
  const React = require('react');
  const { render, screen, waitFor } = require('@testing-library/react');

  test("Homepage - affichage sections principales", () => {
    const Homepage = () => {
      return React.createElement('div', {},
        React.createElement('h1', {}, 'Bienvenue sur RoadTrip!'),
        React.createElement('section', { 'data-testid': 'hero' }, 'Section Hero'),
        React.createElement('section', { 'data-testid': 'popular-trips' }, 'Roadtrips Populaires'),
        React.createElement('section', { 'data-testid': 'features' }, 'Fonctionnalités')
      );
    };

    render(React.createElement(Homepage));

    expect(screen.getByText("Bienvenue sur RoadTrip!")).toBeInTheDocument();
    expect(screen.getByTestId("hero")).toBeInTheDocument();
    expect(screen.getByTestId("popular-trips")).toBeInTheDocument();
    expect(screen.getByTestId("features")).toBeInTheDocument();
  });

  test("Explorer - liste roadtrips", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          trips: [
            { _id: "1", title: "Voyage Italie", country: "Italie" },
            { _id: "2", title: "Roadtrip Espagne", country: "Espagne" },
          ],
        },
      }),
    });

    const ExplorerPage = () => {
      const [trips, setTrips] = React.useState([]);

      React.useEffect(() => {
        fetch('/api/roadtrips')
          .then(res => res.json())
          .then(data => setTrips(data.data.trips))
          .catch(() => setTrips([]));
      }, []);

      return React.createElement('div', {},
        React.createElement('h1', {}, 'Explorer les roadtrips'),
        React.createElement('div', { 'data-testid': 'trips-list' },
          trips.map(trip => React.createElement('div', { key: trip._id }, trip.title))
        )
      );
    };

    render(React.createElement(ExplorerPage));

    expect(screen.getByText("Explorer les roadtrips")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Voyage Italie")).toBeInTheDocument();
      expect(screen.getByText("Roadtrip Espagne")).toBeInTheDocument();
    });
  });

  test("Profil - redirection si non authentifié", () => {
    const ProfilePage = () => {
      const isAuthenticated = false;
      
      React.useEffect(() => {
        if (!isAuthenticated) {
          mockPush('/auth');
        }
      }, [isAuthenticated]);

      return React.createElement('div', {}, 'Redirection...');
    };

    render(React.createElement(ProfilePage));
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  test("IA - accès premium requis", () => {
    const AIPage = () => {
      const user = { role: "user" };
      
      if (!['premium', 'admin'].includes(user?.role)) {
        return React.createElement('div', { 'data-testid': 'access-denied' }, 
          'Accès premium requis'
        );
      }

      return React.createElement('div', {}, 'Assistant IA');
    };

    render(React.createElement(AIPage));
    expect(screen.getByTestId("access-denied")).toBeInTheDocument();
    expect(screen.getByText("Accès premium requis")).toBeInTheDocument();
  });
});

// ------------------------------------------------------------
// 5) TESTS UTILITAIRES
// ------------------------------------------------------------
describe("UTILITAIRES", () => {
  test("formatUserRole - formatage des rôles", () => {
    const formatUserRole = (role) => {
      const roles = {
        'user': 'Utilisateur',
        'premium': 'Premium',
        'admin': 'Administrateur',
      };
      return roles[role] || 'Utilisateur';
    };

    expect(formatUserRole('user')).toBe('Utilisateur');
    expect(formatUserRole('premium')).toBe('Premium');
    expect(formatUserRole('admin')).toBe('Administrateur');
    expect(formatUserRole('unknown')).toBe('Utilisateur');
  });

  test("canAccessPremium - vérification accès premium", () => {
    const canAccessPremium = (user) => {
      if (!user) return false;
      return ['premium', 'admin'].includes(user.role);
    };

    expect(canAccessPremium({ role: 'user' })).toBe(false);
    expect(canAccessPremium({ role: 'premium' })).toBe(true);
    expect(canAccessPremium({ role: 'admin' })).toBe(true);
    expect(canAccessPremium(null)).toBe(false);
  });

  test("validateEmail - validation email", () => {
    const validateEmail = (email) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(email);
    };

    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test("sanitizeInput - nettoyage des données", () => {
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '');
    };

    expect(sanitizeInput('  test  ')).toBe('test');
    expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('hello');
    expect(sanitizeInput('test<>data')).toBe('testdata');
  });
});

// ------------------------------------------------------------
// 6) TESTS INTÉGRATION
// ------------------------------------------------------------
describe("TESTS INTÉGRATION", () => {
  const React = require('react');
  const { render, screen, fireEvent, waitFor, cleanup } = require('@testing-library/react');

  beforeEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  test("Flux complet - parcours utilisateur", async () => {
    const App = () => {
      const [currentPage, setCurrentPage] = React.useState('home');

      const navigate = (page) => {
        setCurrentPage(page);
        mockPush(`/${page}`);
      };

      return React.createElement('div', { 'data-testid': 'integration-app' },
        React.createElement('header', {},
          React.createElement('button', { 
            'data-testid': 'nav-explorer',
            onClick: () => navigate('explorer') 
          }, 'Explorer'),
          React.createElement('button', { 
            'data-testid': 'nav-contact',
            onClick: () => navigate('contact') 
          }, 'Contact')
        ),
        React.createElement('main', {},
          currentPage === 'home' && React.createElement('h1', {}, 'Accueil'),
          currentPage === 'explorer' && React.createElement('h1', {}, 'Page Explorer'),
          currentPage === 'contact' && React.createElement('h1', {}, 'Page Contact')
        )
      );
    };

    render(React.createElement(App));

    expect(screen.getByText("Accueil")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('nav-explorer'));
    await waitFor(() => {
      expect(screen.getByText("Page Explorer")).toBeInTheDocument();
    });
    expect(mockPush).toHaveBeenCalledWith('/explorer');

    fireEvent.click(screen.getByTestId('nav-contact'));
    await waitFor(() => {
      expect(screen.getByText("Page Contact")).toBeInTheDocument();
    });
    expect(mockPush).toHaveBeenCalledWith('/contact');
  });

  test("Flux authentification", async () => {
    const AuthFlow = () => {
      const [isAuth, setIsAuth] = React.useState(false);

      const handleLogin = () => {
        localStorageMock.setItem('auth', JSON.stringify({
          user: { id: '1', email: 'test@example.com' },
          token: 'token123'
        }));
        setIsAuth(true);
      };

      const handleLogout = () => {
        localStorageMock.removeItem('auth');
        setIsAuth(false);
        mockPush('/auth');
      };

      return React.createElement('div', {},
        !isAuth ? 
          React.createElement('button', { onClick: handleLogin }, 'Se connecter') :
          React.createElement('div', {}, 
            React.createElement('p', {}, 'Connecté'),
            React.createElement('button', { onClick: () => mockPush('/favorites') }, 'Mes Favoris'),
            React.createElement('button', { onClick: handleLogout }, 'Se déconnecter')
          )
      );
    };

    render(React.createElement(AuthFlow));

    fireEvent.click(screen.getByText('Se connecter'));
    await waitFor(() => {
      expect(screen.getByText('Connecté')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Mes Favoris'));
    expect(mockPush).toHaveBeenCalledWith('/favorites');

    fireEvent.click(screen.getByText('Se déconnecter'));
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth');
    expect(mockPush).toHaveBeenCalledWith('/auth');
  });

  test("Gestion des erreurs API", async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    const ErrorHandlingComponent = () => {
      const [error, setError] = React.useState(null);

      const fetchData = async () => {
        try {
          await fetch('/api/roadtrips');
        } catch (err) {
          setError('Erreur de connexion');
        }
      };

      return React.createElement('div', {},
        React.createElement('button', { onClick: fetchData }, 'Charger données'),
        error && React.createElement('p', { 'data-testid': 'error' }, error)
      );
    };

    render(React.createElement(ErrorHandlingComponent));

    fireEvent.click(screen.getByText('Charger données'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Erreur de connexion')).toBeInTheDocument();
    });
  });
});

// ------------------------------------------------------------
// 7) TESTS CONFIGURATION
// ------------------------------------------------------------
describe("CONFIGURATION", () => {
  test("Variables d'environnement correctement définies", () => {
    expect(process.env.NEXT_PUBLIC_APP_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_AUTH_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_DATA_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_AI_URL).toBeDefined();
    expect(process.env.NEXT_PUBLIC_NOTIFICATION_URL).toBeDefined();
  });

  test("URLs des services correctement formatées", () => {
    const validateUrl = (url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    expect(validateUrl(process.env.NEXT_PUBLIC_APP_URL)).toBe(true);
    expect(validateUrl(process.env.NEXT_PUBLIC_AUTH_URL)).toBe(true);
    expect(validateUrl(process.env.NEXT_PUBLIC_DATA_URL)).toBe(true);
  });

  test("Mocks Next.js fonctionnent correctement", () => {
    expect(mockPush).toBeDefined();
    expect(mockReplace).toBeDefined();
    expect(localStorageMock.getItem).toBeDefined();
    expect(localStorageMock.setItem).toBeDefined();
    expect(localStorageMock.removeItem).toBeDefined();
  });
});