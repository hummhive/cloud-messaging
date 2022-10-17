import React, { useMemo } from 'react';
import countryList from 'react-select-country-list';
import { useApi } from '@hummhive/api-react-utils';
import { useRecoilValueLoadable } from 'recoil';
import {
  useUpdateConnectionConfig,
  withConnectionConfig,
} from '@hummhive/state/connection';
import propsMapper from '../../utils/propsMapper';
import Config from './Config';

const connectionId = 'honeyworks-notify';
const mapProps = () => {
  const honeyworksSendGridAPI = useApi(Symbol.for('notify'), connectionId);
  const notificationsAPI = useApi(Symbol.for('notification'));
  const updateconnectionConfig = useUpdateConnectionConfig();
  const connectionConfig = useRecoilValueLoadable(
    withConnectionConfig(connectionId)
  ).valueMaybe();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);;
  const options = useMemo(() => countryList().getData(), []);

  React.useEffect(() => {
    if (connectionConfig && connectionConfig?.content.jobId !== null)
      syncStatus();
  }, [connectionConfig]);

  const connectSendGridAccount = async () => {
    try {
      setIsLoading(true);
      const data = await honeyworksSendGridAPI.setup();
      const config = {
        username: data.result.username,
        members_synced: false,
        verified_sender_email: null,
        verified_sender_id: null,
        unsubscribe_group_id: data.result.createGroup.id,
        jobId: null,
        stepCompleted: 1
      };
      await updateconnectionConfig(connectionId, config);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      notificationsAPI.add(err, 'error');
    }
  };

  const createSender = async () => {
    try {
      setIsLoading(true);
      const data = await honeyworksSendGridAPI.createSender(name, `${email}@em1972.humm.earth`, country.label, address, city);
      setIsLoading(false);
      if(data.success){
        await updateconnectionConfig(connectionId, {
          ...connectionConfig.content,
          verified_sender_id: data.result.id,
          verified_sender_email: data.result.from.email,
          stepCompleted: 2
        });
        syncMembers();
      }
    } catch (err) {
      setIsLoading(false);
      notificationsAPI.add(err, 'error');
    }
  };

  const syncMembers = async () => {
    try {
      setIsLoading(true);
      const getJob = await honeyworksSendGridAPI.syncContacts();
      if(!getJob){
      setIsLoading(false);
      return notificationsAPI.add('No Hive Members with Email Address to Sync!', 'alert');
      }
      await updateconnectionConfig(connectionId, {
        ...connectionConfig.content,
        members_synced: false,
        jobId: getJob.result.jobs_id
      });
    } catch (err) {
      setIsLoading(false);
      notificationsAPI.add(err, 'error');
    }
  };

  const deleteUsers = async () => {
    try {
      await honeyworksSendGridAPI.deleteAccount();
      await updateconnectionConfig(connectionId, {
        ...connectionConfig.content,
        username: null,
        members_synced: null,
        verified_sender_email: null,
        verified_sender_id: null,
        unsubscribe_group_id: null,
        jobId: null,
        stepCompleted: null
      });
    } catch (err) {
      notificationsAPI.add(err, "You don't have an account");
    }
  };

  const syncStatus = async () => {
    try {
      if(connectionConfig?.content.jobId === undefined){
        await updateconnectionConfig(connectionId, {
          ...connectionConfig.content,
          jobId: null
        });
        return notificationsAPI.add('No Job ID', 'error');
      }
      let interval;
      watchSyncStatusInterval();
       async function watchSyncStatusInterval() {
      const prevJobId = [...connectionConfig.content.jobId];
      const jobStage = await honeyworksSendGridAPI.contactStatus(connectionConfig.content.jobId);
      if (!interval){
          interval = setInterval(watchSyncStatusInterval, 5000);
          setIsLoading(true);
       } else if (jobStage.result.status === "completed") {
           prevJobId.shift()
           await updateconnectionConfig(connectionId, {
             ...connectionConfig.content,
             members_synced: true,
             jobId: prevJobId.length === 0 ? null : prevJobId,
           });
           setIsLoading(false);
           clearInterval(interval);
    }
  }
    } catch (err) {
      notificationsAPI.add(err, 'error');
    }
  };

  return {
    connectSendGridAccount,
    isLoading,
    connectionConfig,
    syncStatus,
    name,
    setName,
    email,
    deleteUsers,
    address,
    setAddress,
    setEmail,
    createSender,
    city,
    setCity,
    country,
    options,
    setCountry,
    syncMembers,
  };
};

export default propsMapper(mapProps)(Config);
