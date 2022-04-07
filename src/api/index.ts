import { injectable, inject, optional } from 'inversify';
import { getRecoil } from 'recoil-nexus';
import emailTemplate from '../utils/emailTemplate'
import { withActiveHive } from '@hummhive/state/hive';
import packageJson from '../../package.json';

@injectable()
export default class HoneyworksSendGridAPI {
  connectionDefinition;
  jobId: string;
  _baseURL: string = 'https://api.sendgrid.com/v3';
  // _baseURL: string = 'http://127.0.0.1:8787';

  _secrets;
  _notifications;
  _hive;
  _publisher;
  _groupAPI;
  _blobAPI;
  _cellApi;
  _memberAPI;
  _cryptoUtilsAPI;
  _secretsAPI;
  _eventsAPI;
  _connectionAPI;

  constructor(
    @inject(Symbol.for('notification')) notifications,
    @inject(Symbol.for('hive')) hive,
    @inject(Symbol.for('@honeyworks/publisher')) @optional() publisher,
    @inject(Symbol.for('blob')) blobAPI,
    @inject(Symbol.for('group')) groupAPI,
    @inject(Symbol.for('member')) memberAPI,
    @inject(Symbol.for('event')) events,
    @inject(Symbol.for('crypto-util')) cryptoUtilsAPI,
    @inject(Symbol.for('secret')) secretsAPI,
    @inject(Symbol.for('cell')) cell,
    @inject(Symbol.for('connection')) connectionAPI,
    @inject(Symbol.for('event')) eventsAPI,
    @inject(Symbol.for('util')) utilAPI
  ) {
    this._notifications = notifications;
    this._hive = hive;
    this._publisher = publisher;
    this._groupAPI = groupAPI;
    this._blobAPI = blobAPI;
    this._memberAPI = memberAPI;
    this._cellApi = cell;
    this._cryptoUtilsAPI = cryptoUtilsAPI;
    this._secretsAPI = secretsAPI;
    this._connectionAPI = connectionAPI;
    this._eventsAPI = eventsAPI
    this.connectionDefinition =
      connectionAPI.packageJsonToConnectionDefinition(packageJson);

    this.registerForEvents();
  }

  async getUI(dirName: string): Promise<any> {
    const ui = await import(`../userInterfaces/${dirName}`);
    return ui.default;
  }

  async getConfigUI(): Promise<any> {
    const ui = await import(`../userInterfaces/Config`);
    return ui.default;
  }

  registerForEvents() {
    this._eventsAPI.on(
      'memberAdded',
      this.handleMembersSyncEvent.bind(this)
    );
  }

  async isConfigured() {
    const config = await this._connectionAPI.getConfig(
      this.connectionDefinition.connectionId
    );

    return (
      !!config
    );
  }

  async handleMembersSyncEvent() {
      const job = await this.syncContacts();
      const config = await this._connectionAPI.getConfig(
        this.connectionDefinition.connectionId
      );

      await this._connectionAPI.updateConfig({
        connectionId: this.connectionDefinition.connectionId,
        config: {
            ...config.values,
            jobId: job.job_id
        }
      });
  }

  async setup(sendGridKeyId: string, sendGridKey: string) {
    this._secretsAPI.add('hummhive', 'sendGridApiKey', sendGridKey);
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/api_keys/` + sendGridKeyId, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Unauthorized: Double check that your API ID and Key are correct!");
      }
      return await res.json();
    });

    return res;
  }

  async checkVerifiedSenders() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/verified_senders/steps_completed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Unauthorized: Double check that your API ID and Key are correct!");
      }
      return await res.json();
    });

    return res;
  }

  async syncContacts() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const members = await this._memberAPI.list();
    const membersEmails = members.filter(x => x.content.email !== null)
    .map(str => ({email: str.content.email}))
    if(membersEmails.length === 0){
      return null;
    }
    const res = await fetch(`${this._baseURL}/marketing/contacts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        "contacts": membersEmails,
    }),
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }

      this._notifications.add(
        'Your Hive members are being synced with SendGrid. You can check the status in the connection settings!',
        'alert'
      );

      return res.json();
    });

    return res;
  }

  async contactStatus(jobId) {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/marketing/contacts/imports/` + jobId, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return res.json();
    });

    return res;
  }

  async createSuppressionGroup() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const hive = await getRecoil(withActiveHive);
    const groups = await this.getSuppressionGroups();
    const supressionGroup = groups.find(group => group.name === "HummHive Supression Group");
    if(supressionGroup)
    await this.deleteSuppressionGroups(supressionGroup);
    const res = await fetch(`${this._baseURL}/asm/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        "name": "HummHive Supression Group",
        "description": "Default Supression Group for your Humm Hive",
        "is_default": true,
    }),
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return await res.json();
    });

    return res;
  }

  async getSuppressionGroups() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/asm/groups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return res.json();
    });

    return res;
  }

  async deleteSuppressionGroups(group) {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/asm/groups/${group.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return;
    });

    return res;
  }

  async getVerifiedSenders() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const hive = await getRecoil(withActiveHive);
    const res = await fetch(`${this._baseURL}/verified_senders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return await res.json();
    });

    return res;
  }

  async createList() {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const hive = await getRecoil(withActiveHive);
    const res = await fetch(`${this._baseURL}/marketing/lists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        "name": hive.signingPublicKey,
    }),
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return await res.json();
    });

    return res;
  }

  async deleteList(id) {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/marketing/lists/` + id, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return await res.json();
    });

    return res;
  }

  async sendSchedule(id) {
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const res = await fetch(`${this._baseURL}/marketing/singlesends/${id}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
      "send_at": "now"
    }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Error");
      }
      return await res.json();
    });

    return res;
  }

  async sendAll(title: string, id: string, url: string, date: string, content: string) {
    const hive = await getRecoil(withActiveHive);
    const config = await this._connectionAPI.getConfig(
      this.connectionDefinition.connectionId
    );
    if(!content)
    throw new Error("Newsletter can't be sent without content!");
    const apiKey = this._secretsAPI.get('hummhive', 'sendGridApiKey');
    const buildEmailTemplate = emailTemplate(hive, id, url, date, title, content);
    const res = await fetch(`${this._baseURL}/marketing/singlesends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
      "name": title,
      "send_to": {
        "all": true
      },
      "email_config": {
        "subject": title,
        "suppression_group_id": config.content.unsubscribe_group_id,
        "sender_id": config.content.verified_sender_id,
        "html_content": buildEmailTemplate,
      }
    }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Error");
      }
      const response = await res.json();
      await this.sendSchedule(response.id);
      return response;
    });

    return res;
  }

}
