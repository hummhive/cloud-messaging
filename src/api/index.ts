import { injectable, inject, optional } from 'inversify';
import { getRecoil } from 'recoil-nexus';
import { withActiveHive } from '@hummhive/state/hive';
import appendProvider from '../utils/appendProvider';
import packageJson from '../../package.json';

@injectable()
export default class HoneyworksSendGridAPI {
  connectionDefinition;
  jobId: string;
  _baseURL: string = 'https://honeyworks-messaging.hummhive.workers.dev';
  _secrets;
  _notifications;
  _hive;
  _publisher;
  _groupAPI;
  _groupMemberAPI;
  _blobAPI;
  _cellApi;
  _memberAPI;
  _identityApi;
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
    @inject(Symbol.for('group-member')) groupMemberAPI,
    @inject(Symbol.for('event')) events,
    @inject(Symbol.for('crypto-util')) cryptoUtilsAPI,
    @inject(Symbol.for('secret')) secretsAPI,
    @inject(Symbol.for('identity')) identityApi,
    @inject(Symbol.for('cell')) cell,
    @inject(Symbol.for('connection')) connectionAPI,
    @inject(Symbol.for('event')) eventsAPI,
    @inject(Symbol.for('util')) utilAPI
  ) {
    this._notifications = notifications;
    this._hive = hive;
    this._publisher = publisher;
    this._groupAPI = groupAPI;
    this._groupMemberAPI = groupMemberAPI;
    this._blobAPI = blobAPI;
    this._identityApi = identityApi;
    this._memberAPI = memberAPI;
    this._cellApi = cell;
    this._cryptoUtilsAPI = cryptoUtilsAPI;
    this._secretsAPI = secretsAPI;
    this._connectionAPI = connectionAPI;
    this._eventsAPI = eventsAPI
    this.connectionDefinition =
      connectionAPI.packageJsonToConnectionDefinition(packageJson);

    this.registerForEvents();

    if (utilAPI.isDev || utilAPI.isStaging)
      this._baseURL =
        'https://honeyworks-messaging-staging.hummhive.workers.dev';

     //local cf worker development
     // this._baseURL = 'http://127.0.0.1:8787';

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
    this._eventsAPI.on(
      'groupAdded',
      this.handleMembersSyncEvent.bind(this)
    );
    this._eventsAPI.on(
      'groupUpdated',
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

  async setup() {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;

    const res = await fetch(`${this._baseURL}/init?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': signature,
      },
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Unauthorized: Double check that your API ID and Key are correct!");
      }
      return await res.json();
    });

    return res;
  }

  async createSender(name, email, country, address, city) {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;

    const res = await fetch(`${this._baseURL}/createSender?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': signature,
      },
      body: JSON.stringify({
        name, email, country, address, city
    }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Unauthorized: Double check that your API ID and Key are correct!");
      }
      return await res.json();
    });

    return res;
  }

  async syncContacts() {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;

    const getGroups = await this._groupAPI.list();

    const getMembersAndGroups = await Promise.all(getGroups.map(async (group) => {
      let groupMembers = await this._memberAPI.listByGroups([group.header.id]);
      const membersEmails = groupMembers.filter(member => !!member.content.email)
      .map(str => ({email: str.content.email}))
      return ({list_name: group.content.name, list_ids: [`${hive.header.id}_${group.header.id}`], contacts: membersEmails});
    }));

    const members = await this._memberAPI.list();
    const membersEmails = members.filter(x => !!x.content.email).map(str => ({email: str.content.email}))

    if(membersEmails.length === 0){
      return null;
    }

    const res = await fetch(`${this._baseURL}/importContacts?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "groups_and_contacts": getMembersAndGroups,
        "all_contacts": membersEmails,
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
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;
    const res = await fetch(`${this._baseURL}/getContactStatus?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: jobId[0].job_id

    }),
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return res.json();
    });

    return res;
  }

  async deleteAccount() {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;
    const res = await fetch(`${this._baseURL}/deleteSubUser?${encodedParams}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(async (res) => {
      if (!res.ok) {
        return;
      }
      return res.json();
    });

    return res;
  }

  async send({title, content, groups, types}) {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;
    const config = await this._connectionAPI.getConfig(
      this.connectionDefinition.connectionId
    );
    if(!content)
    throw new Error("Newsletter can't be sent without content!");
    const res = await fetch(`${this._baseURL}/send?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      "name": title,
      "send_to": {
        "list_ids": groups,
        "all": false,
      },
      "email_config": {
        "subject": title,
        "suppression_group_id": config.content.unsubscribe_group_id,
        "sender_id": config.content.verified_sender_id,
        "html_content": appendProvider(content, hive.content.name),
      }
    }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Error");
      }

      return res.json();
    });

    return res;
  }

  async sendAll(title: string, content: string, types: string[]) {
    const hive = await getRecoil(withActiveHive);
    const myPublicKeys = await this._identityApi.getActivePublicKeys();
    const signature = await this._identityApi.sign(Date.now().toString());
    const encodedParams = `hiveId=${encodeURIComponent(
      hive.header.id
    )}&publicKey=${encodeURIComponent(
      myPublicKeys.signing
    )}`;
    const config = await this._connectionAPI.getConfig(
      this.connectionDefinition.connectionId
    );
    if(!content)
    throw new Error("Newsletter can't be sent without content!");
    const res = await fetch(`${this._baseURL}/send?${encodedParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
      "name": title,
      "send_to": {
        "list_ids": [],
        "all": true
      },
      "email_config": {
        "subject": title,
        "suppression_group_id": config.content.unsubscribe_group_id,
        "sender_id": config.content.verified_sender_id,
        "html_content": appendProvider(content, hive.content.name),
      }
    }),
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error("Error");
      }

      return res.json();
    });

    return res;
  }

}
