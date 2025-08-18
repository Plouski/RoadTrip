const axios = require("axios");
const logger = require("../utils/logger");

class DataService {
  constructor() {
    // Configuration avec variables multiples pour Docker
    const rawBaseURL = process.env.DATA_SERVICE_URL_DOCKER || 
                      process.env.DATA_SERVICE_URL || 
                      "http://localhost:5002";
    
    logger.info(`🔗 Configuration Data Service`, {
      rawBaseURL,
      dockerUrl: process.env.DATA_SERVICE_URL_DOCKER,
      standardUrl: process.env.DATA_SERVICE_URL,
      fallbackUrl: "http://localhost:5002"
    });
    
    this.baseURL = `${rawBaseURL}/api`;
    this.healthURL = `${rawBaseURL}/health`; 

    // Client principal pour API
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
        "X-Service": "auth-service",
        "User-Agent": "auth-service/1.0.0"
      },
    });

    // Client séparé pour health check
    this.healthClient = axios.create({
      baseURL: rawBaseURL,
      timeout: 3000,
      headers: {
        "Content-Type": "application/json",
        "X-Service": "auth-service",
      },
    });

    // Intercepteur de requête avec logging
    this.client.interceptors.request.use(
      (config) => {
        const requestId = Math.random().toString(36).substr(2, 9);
        config.metadata = { startTime: Date.now(), requestId };
        
        logger.debug(`📡 Requête vers data-service`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timeout: config.timeout,
          requestId,
          hasData: !!config.data
        });
        
        return config;
      },
      (error) => {
        logger.error("❌ Erreur configuration requête data-service", {
          error: {
            message: error.message,
            code: error.code
          }
        });
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse avec logging
    this.client.interceptors.response.use(
      (response) => {
        const { config } = response;
        const duration = Date.now() - config.metadata.startTime;
        
        logger.info(`✅ Réponse data-service`, {
          method: config.method?.toUpperCase(),
          url: config.url,
          statusCode: response.status,
          duration,
          requestId: config.metadata.requestId,
          responseSize: JSON.stringify(response.data).length
        });
        
        if (duration > 2000) {
          logger.performance('Requête data-service lente', {
            method: config.method?.toUpperCase(),
            url: config.url,
            duration,
            requestId: config.metadata.requestId
          });
        }
        
        return response;
      },
      (error) => {
        const { config } = error;
        const duration = config?.metadata ? Date.now() - config.metadata.startTime : null;
        
        if (error.code === 'ECONNABORTED') {
          logger.warn('⏰ Timeout data-service', {
            method: config?.method?.toUpperCase(),
            url: config?.url,
            timeout: 5000,
            duration,
            requestId: config?.metadata?.requestId
          });
        } else if (error.response) {
          logger.error('❌ Erreur HTTP data-service', {
            method: config?.method?.toUpperCase(),
            url: config?.url,
            statusCode: error.response.status,
            statusText: error.response.statusText,
            duration,
            requestId: config?.metadata?.requestId,
            responseData: error.response.data
          });
        } else if (error.request) {
          logger.error('❌ Pas de réponse data-service', {
            method: config?.method?.toUpperCase(),
            url: config?.url,
            duration,
            requestId: config?.metadata?.requestId,
            error: error.message
          });
        } else {
          logger.error('❌ Erreur inconnue data-service', {
            error: error.message,
            requestId: config?.metadata?.requestId
          });
        }
        
        return Promise.reject(error);
      }
    );

    logger.info('🔗 DataService initialisé', {
      baseURL: this.baseURL,
      healthURL: this.healthURL,
      timeout: 5000
    });
  }

  // Créer un nouvel utilisateur
  async createUser(userData) {
    const startTime = Date.now();
    
    try {
      logger.user('👤 Création utilisateur', {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "user",
        hasOAuth: !!userData.oauth,
        oauthProvider: userData.oauth?.provider
      });

      const response = await this.client.post("/users", {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        phoneNumber: userData.phoneNumber,
        role: userData.role || "user",
        isVerified: userData.isVerified || false,
        oauth: userData.oauth,
        createdAt: new Date(),
      });

      logger.user('✅ Utilisateur créé avec succès', {
        userId: response.data.id,
        email: userData.email,
        role: userData.role || "user",
        processingTime: Date.now() - startTime
      });

      return response.data;
    } catch (error) {
      logger.error('❌ Erreur création utilisateur', {
        email: userData.email,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        },
        processingTime: Date.now() - startTime
      });
      
      const enhancedError = new Error(
        `Erreur création utilisateur: ${
          error.response?.data?.message || error.message
        }`
      );
      enhancedError.originalError = error;
      enhancedError.statusCode = error.response?.status || 500;
      throw enhancedError;
    }
  }

  // Trouver un utilisateur par email
  async findUserByEmail(email) {
    const startTime = Date.now();
    
    try {
      logger.debug('🔍 Recherche utilisateur par email', {
        email,
        hasEmail: !!email
      });

      const response = await this.client.get(
        `/users/email/${encodeURIComponent(email)}`
      );
      
      logger.user('✅ Utilisateur trouvé par email', {
        email,
        userId: response.data.id,
        role: response.data.role,
        processingTime: Date.now() - startTime
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.debug('👤 Utilisateur non trouvé par email', {
          email,
          processingTime: Date.now() - startTime
        });
        return null;
      }
      
      logger.error('❌ Erreur recherche utilisateur par email', {
        email,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        },
        processingTime: Date.now() - startTime
      });
      
      const enhancedError = new Error(
        `Erreur recherche utilisateur: ${
          error.response?.data?.message || error.message
        }`
      );
      enhancedError.originalError = error;
      enhancedError.statusCode = error.response?.status || 500;
      throw enhancedError;
    }
  }

  // Trouver un utilisateur par ID
  async findUserById(userId) {
    const startTime = Date.now();
    
    try {
      if (!userId) {
        throw new Error('userId est requis');
      }

      logger.debug('🔍 Recherche utilisateur par ID', {
        userId
      });

      const response = await this.client.get(`/users/${userId}`);
      
      logger.user('✅ Utilisateur trouvé par ID', {
        userId,
        email: response.data.email,
        role: response.data.role,
        processingTime: Date.now() - startTime
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        logger.debug('👤 Utilisateur non trouvé par ID', {
          userId,
          processingTime: Date.now() - startTime
        });
        return null;
      }
      
      logger.error('❌ Erreur recherche utilisateur par ID', {
        userId,
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        },
        processingTime: Date.now() - startTime
      });
      
      const enhancedError = new Error(
        `Erreur recherche utilisateur: ${
          error.response?.data?.message || error.message
        }`
      );
      enhancedError.originalError = error;
      enhancedError.statusCode = error.response?.status || 500;
      throw enhancedError;
    }
  }

  // Mettre à jour un utilisateur
  async updateUser(userId, updateData) {
    const startTime = Date.now();
    
    try {
      if (!userId) {
        throw new Error('userId est requis');
      }

      logger.user('📝 Mise à jour utilisateur', {
        userId,
        updateFields: Object.keys(updateData),
        updateFieldsCount: Object.keys(updateData).length
      });

      const response = await this.client.put(`/users/${userId}`, updateData);
      
      logger.user('✅ Utilisateur mis à jour avec succès', {
        userId,
        updatedFields: Object.keys(updateData),
        processingTime: Date.now() - startTime
      });
      
      return response.data;
    } catch (error) {
      logger.error('❌ Erreur mise à jour utilisateur', {
        userId,
        updateData: Object.keys(updateData),
        error: {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        },
        processingTime: Date.now() - startTime
      });
      
      const enhancedError = new Error(
        `Erreur mise à jour utilisateur: ${
          error.response?.data?.message || error.message
        }`
      );
      enhancedError.originalError = error;
      enhancedError.statusCode = error.response?.status || 500;
      throw enhancedError;
    }
  }

  // Health check
  async healthCheck() {
    const startTime = Date.now();
    
    try {
      logger.debug('🏥 Health check data-service');
      
      const response = await this.healthClient.get("/health");
      
      const healthData = {
        status: 'healthy',
        dataService: {
          url: this.healthURL,
          status: response.status,
          data: response.data,
          responseTime: Date.now() - startTime
        }
      };
      
      logger.info('✅ Data-service healthy', {
        responseTime: healthData.dataService.responseTime,
        status: response.status,
        dataServiceStatus: response.data?.status
      });
      
      return healthData;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('❌ Data-service unhealthy', {
        error: {
          message: error.message,
          status: error.response?.status,
          code: error.code
        },
        responseTime,
        healthURL: this.healthURL
      });
      
      const healthData = {
        status: 'unhealthy',
        dataService: {
          url: this.healthURL,
          error: error.message,
          responseTime,
          status: error.response?.status || 'no_response'
        }
      };
      
      throw new Error("Data-service non disponible");
    }
  }

  // Enregistrer une tentative de connexion OAuth
  async logOAuthAttempt(provider, success, userData = null) {
    const eventData = {
      userId: userData?.id || null,
      action: 'oauth_login',
      provider,
      success,
      metadata: {
        userAgent: userData?.userAgent,
        ip: userData?.ip,
        email: userData?.email
      }
    };
    
    return this.logAuthEvent(eventData);
  }

  // Enregistrer une création de compte OAuth
  async logOAuthRegistration(provider, userData) {
    const eventData = {
      userId: userData.id,
      action: 'oauth_register',
      provider,
      success: true,
      metadata: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName
      }
    };
    
    return this.logAuthEvent(eventData);
  }

  // Fonction pour obtenir des statistiques du service
  getServiceStats() {
    const stats = {
      service: 'auth-service-data-client',
      baseURL: this.baseURL,
      healthURL: this.healthURL,
      timeout: 5000,
      timestamp: new Date().toISOString()
    };
    
    logger.debug('📊 Stats DataService', stats);
    
    return stats;
  }

  // Test de connectivité simple
  async testConnection() {
    const startTime = Date.now();
    
    try {
      logger.debug('🔌 Test de connexion data-service');
      
      await this.healthClient.get('/health', { timeout: 2000 });
      
      const responseTime = Date.now() - startTime;
      
      logger.info('✅ Connexion data-service OK', {
        responseTime,
        baseURL: this.baseURL
      });
      
      return {
        connected: true,
        responseTime,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('❌ Test connexion data-service échoué', {
        error: {
          message: error.message,
          code: error.code,
          status: error.response?.status
        },
        responseTime,
        baseURL: this.baseURL
      });
      
      return {
        connected: false,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }
}

const dataService = new DataService();

module.exports = dataService;